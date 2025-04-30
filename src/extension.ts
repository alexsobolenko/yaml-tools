import {ExtensionContext, languages, workspace} from 'vscode';
import App from './app';

export function activate(context: ExtensionContext) {
    App.instance.providers.forEach((p) => {
        context.subscriptions.push(languages.registerDefinitionProvider(p.selector, p.provider));
    });

    App.instance.watchers.forEach((w) => {
        context.subscriptions.push(
            w.watcher,
            w.watcher.onDidChange(async (uri) => {
                await w.handler(uri);
            }),
        );
    });

    workspace.findFiles('**/*.{yml,yaml}').then((files) => {
        files.forEach(async (uri) => {
            await App.instance.yamlParser.processDocument(await workspace.openTextDocument(uri));
        });
    });
}

export function deactivate() {}
