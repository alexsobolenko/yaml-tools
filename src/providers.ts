import {Definition, DefinitionProvider, Position, ProviderResult, TextDocument} from 'vscode';
import {CacheManager} from './services';

export class YamlDefinitionProvider implements DefinitionProvider {
    private cacheManager: CacheManager;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
    }

    provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition> {
        const wordRange = document.getWordRangeAtPosition(position, /%([^%]+)%/);
        if (!wordRange) {
            return null;
        }

        const paramName = document.getText(wordRange).slice(1, -1);

        return this.cacheManager.getParamDefinition(paramName);
    }
}
