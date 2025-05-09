import {Location, Position, TextDocument, Uri, window, workspace} from 'vscode';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {resolvePath} from './utils';
import App from './app';

export class YamlParser {
    public async processDocument(document: TextDocument) {
        try {
            const content = yaml.parse(document.getText());
            (content?.imports || []).forEach(async (importItem: any) => {
                await this.processImport(document.uri, importItem);
            });
            await this.cacheParametersFromFile(document.uri, content);
        } catch (error: any) {
            if (error.name === 'YAMLParseError' && error.code === 'DUPLICATE_KEY') {
                window.showWarningMessage(`${document.uri.fsPath} contains duplicate YAML keys`);
            } else {
                window.showErrorMessage(`Failed YAML parse ${document.uri.fsPath}: ${error.message}`);
            }
        }
    }

    private async processImport(baseUri: Uri, importItem: any) {
        if (!importItem?.resource) {
            return;
        }

        try {
            const resourcePath = resolvePath(baseUri.fsPath, importItem.resource);
            const stats = await fs.promises.stat(resourcePath);
            if (stats.isFile()) {
                await this.processSingleFile(Uri.file(resourcePath));
            } else if (stats.isDirectory()) {
                await this.processDirectory(resourcePath);
            }
        } catch (error) {
            window.showErrorMessage(`Failed to process import ${importItem.file}: ${error}`);
        }
    }

    private async processSingleFile(fileUri: Uri) {
        const doc = await workspace.openTextDocument(fileUri);
        const content = yaml.parse(doc.getText());
        (content?.imports || []).forEach(async (nestedImport: any) => {
            await this.processImport(fileUri, nestedImport);
        });

        this.cacheParametersFromFile(fileUri, content);
    }

    private async processDirectory(dirPath: string) {
        const dirItems = await fs.promises.readdir(dirPath);
        dirItems.forEach(async (dirItem: any) => {
            const fullPath = path.join(dirPath, dirItem);
            const stats = await fs.promises.stat(fullPath);
            if (stats.isFile()) {
                if (dirItem.endsWith('.yml') || dirItem.endsWith('.yaml')) {
                    const fileUri = Uri.file(path.join(dirPath, dirItem));
                    await this.processSingleFile(fileUri);
                }
            } else if (stats.isDirectory()) {
                await this.processDirectory(fullPath);
            }
        });
    }

    private async cacheParametersFromFile(fileUri: Uri, content: any) {
        Object.keys(content?.parameters || {}).forEach(async (paramName: string) => {
            const position = await this.findParameterPosition(fileUri, paramName);
            if (position) {
                App.instance.cacheManager.cacheParam(paramName, new Location(fileUri, position));
            }
        });
    }

    private async findParameterPosition(fileUri: Uri, paramName: string): Promise<Position|null> {
        const doc = await workspace.openTextDocument(fileUri);
        const text = doc.getText();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`${paramName}:`)) {
                return new Position(i, lines[i].indexOf(paramName));
            }
        }

        return null;
    }
}

export class DotenvParser {
    async processEnvFiles() {
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const baseDir = workspaceFolder.uri.fsPath;
        ['.env', '.env.local'].forEach(async (filename) => {
            const fullPath = path.join(baseDir, filename);
            if (fs.existsSync(fullPath)) {
                await this.processSingleFile(Uri.file(fullPath));
            }
        });
    }

    private async processSingleFile(fileUri: Uri) {
        const doc = await workspace.openTextDocument(fileUri);
        const lines = doc.getText().split('\n');
        lines.forEach((line, index) => {
            const match = line.match(/^([A-Z0-9_]+)=/);
            if (match) {
                const varName = match[1] as string;
                const location = new Location(fileUri, new Position(index, 0));
                App.instance.cacheManager.cacheParam(varName, location);
            }
        });
    }
}
