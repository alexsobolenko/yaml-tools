import {Definition, DefinitionProvider, Position, ProviderResult, TextDocument} from 'vscode';
import App from './app';

export class YamlDefinitionProvider implements DefinitionProvider {
    provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition> {
        const wordRange = document.getWordRangeAtPosition(position, /%([^%]+)%/);
        if (!wordRange) {
            return null;
        }

        const paramName = document.getText(wordRange).slice(1, -1);

        return App.instance.cacheManager.getParamDefinition(paramName);
    }
}

export class DotenvDefinitionProvider implements DefinitionProvider {
    provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition> {
        const wordRange = document.getWordRangeAtPosition(position, /%env\(([^)]+)\)%|\${([^}]+)}/);
        if (!wordRange) {
            return null;
        }

        let varName: string|null = null;
        const text = document.getText(wordRange);
        const envMatch = text.match(/^%env\(([^)]+)\)%$/);
        const dockerMatch = text.match(/^\${([^}]+)}$/);
        if (envMatch) {
            const raw = envMatch[1] as string;
            const parts = raw.split(':');
            varName = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
        } else if (dockerMatch) {
            varName = dockerMatch[1] as string;
        }

        return varName === null ? null : App.instance.cacheManager.getParamDefinition(varName);
    }
}
