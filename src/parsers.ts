import {Location, Position, TextDocument, Uri, window, workspace} from 'vscode';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {escapeRegExp, resolvePath} from './utils';
import App from './app';

type YamlImport = {
    resource?: string;
};

type YamlContent = {
    imports?: YamlImport[];
    parameters?: Record<string, unknown>;
};

export class YamlParser {
    public async processDocument(document: TextDocument) {
        await this.processYamlFile(document.uri, document.getText(), new Set<string>());
    }

    private async processYamlFile(fileUri: Uri, text: string, visited: Set<string>) {
        const fileKey = fileUri.toString();
        if (visited.has(fileKey)) {
            return;
        }

        visited.add(fileKey);

        try {
            const content = yaml.parse(text) as YamlContent | null;
            App.instance.cacheManager.invalidateFile(fileUri);

            for (const importItem of content?.imports ?? []) {
                await this.processImport(fileUri, importItem, visited);
            }

            await this.cacheParametersFromFile(fileUri, content);
        } catch (error: any) {
            if (error.name === 'YAMLParseError' && error.code === 'DUPLICATE_KEY') {
                window.showWarningMessage(`${fileUri.fsPath} contains duplicate YAML keys`);
            } else {
                window.showErrorMessage(`Failed YAML parse ${fileUri.fsPath}: ${error.message}`);
            }
        }
    }

    private async processImport(baseUri: Uri, importItem: YamlImport, visited: Set<string>) {
        if (!importItem?.resource) {
            return;
        }

        try {
            const resourcePath = resolvePath(baseUri.fsPath, importItem.resource);
            const stats = await fs.promises.stat(resourcePath);
            if (stats.isFile()) {
                await this.processSingleFile(Uri.file(resourcePath), visited);
            } else if (stats.isDirectory()) {
                await this.processDirectory(resourcePath, visited);
            }
        } catch (error: any) {
            window.showErrorMessage(`Failed to process import ${importItem.resource}: ${error.message}`);
        }
    }

    private async processSingleFile(fileUri: Uri, visited: Set<string>) {
        const doc = await workspace.openTextDocument(fileUri);
        await this.processYamlFile(fileUri, doc.getText(), visited);
    }

    private async processDirectory(dirPath: string, visited: Set<string>) {
        const dirItems = (await fs.promises.readdir(dirPath)).sort();
        for (const dirItem of dirItems) {
            const fullPath = path.join(dirPath, dirItem);
            const stats = await fs.promises.stat(fullPath);
            if (stats.isFile()) {
                if (dirItem.endsWith('.yml') || dirItem.endsWith('.yaml')) {
                    await this.processSingleFile(Uri.file(fullPath), visited);
                }
            } else if (stats.isDirectory()) {
                await this.processDirectory(fullPath, visited);
            }
        }
    }

    private async cacheParametersFromFile(fileUri: Uri, content: YamlContent | null) {
        for (const paramName of Object.keys(content?.parameters ?? {})) {
            const position = await this.findParameterPosition(fileUri, paramName);
            if (position) {
                App.instance.cacheManager.cacheParam(paramName, new Location(fileUri, position));
            }
        }
    }

    private async findParameterPosition(fileUri: Uri, paramName: string): Promise<Position|null> {
        const doc = await workspace.openTextDocument(fileUri);
        const text = doc.getText();
        const lines = text.split('\n');
        const pattern = new RegExp(`^\\s*['"]?${escapeRegExp(paramName)}['"]?\\s*:`);
        for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
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
        for (const filename of ['.env', '.env.local']) {
            const fullPath = path.join(baseDir, filename);
            const fileUri = Uri.file(fullPath);
            App.instance.cacheManager.invalidateFile(fileUri);
            if (fs.existsSync(fullPath)) {
                await this.processSingleFile(fileUri);
            }
        }
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
