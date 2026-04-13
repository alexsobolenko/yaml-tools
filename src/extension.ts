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
                await w.onChange(uri);
            }),
            w.watcher.onDidCreate(async (uri) => {
                await w.onCreate(uri);
            }),
            w.watcher.onDidDelete((uri) => {
                w.onDelete(uri);
            }),
        );
    });

    // yaml
    const files = await workspace.findFiles(YAML_FILES);
    for (const uri of files) {
        await App.instance.yamlParser.processDocument(await workspace.openTextDocument(uri));
    }

    // dotenv
    await App.instance.dotenvParser.processEnvFiles();
    context.subscriptions.push(workspace.onDidSaveTextDocument(async (doc) => {
        if (doc.uri.fsPath.endsWith('.env') || doc.uri.fsPath.endsWith('.env.local')) {
            await App.instance.dotenvParser.processEnvFiles();
        }
    }));
}

export function deactivate() {}
