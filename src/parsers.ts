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
        } catch (error) {
            console.error('YAML parsing failed:', error);
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
