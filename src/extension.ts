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

    const watcher = workspace.createFileSystemWatcher('**/*.{yml,yaml}');
    context.subscriptions.push(
        watcher,
        watcher.onDidChange(async (uri) => {
            cacheManager.invalidateFile(uri);
            await yamlParser.processDocument(await workspace.openTextDocument(uri));
        }),
    );

    workspace.findFiles('**/*.{yml,yaml}').then((files) => {
        files.forEach(async (uri) => {
            await yamlParser.processDocument(await workspace.openTextDocument(uri));
        });
    });
}

export function deactivate() {}
