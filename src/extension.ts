import {ExtensionContext, languages, workspace} from 'vscode';
import {YamlDefinitionProvider} from './providers';
import {CacheManager, YamlParser} from './services';

export function activate(context: ExtensionContext) {
    const cacheManager = new CacheManager();
    const yamlParser = new YamlParser(cacheManager);

    context.subscriptions.push(languages.registerDefinitionProvider(
        {language: 'yaml'},
        new YamlDefinitionProvider(cacheManager),
    ));

    workspace.onDidOpenTextDocument(async (doc) => {
        if (doc.languageId === 'yaml') {
            await yamlParser.processDocument(doc);
        }
    });
}

export function deactivate() {}
