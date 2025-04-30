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
