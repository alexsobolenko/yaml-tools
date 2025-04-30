import {ExtensionContext, languages, workspace} from 'vscode';
import App from './app';
import {YAML_FILES} from './constants';

export async function activate(context: ExtensionContext) {
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

    // yaml
    workspace.findFiles(YAML_FILES).then((files) => {
        files.forEach(async (uri) => {
            await App.instance.yamlParser.processDocument(await workspace.openTextDocument(uri));
        });
    });

    // dotenv
    await App.instance.dotenvParser.processEnvFiles();
    workspace.onDidSaveTextDocument(async (doc) => {
        if (doc.uri.fsPath.endsWith('.env') || doc.uri.fsPath.endsWith('.env.local')) {
            await App.instance.dotenvParser.processEnvFiles();
        }
    });
}

export function deactivate() {}
