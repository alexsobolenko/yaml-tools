import {DefinitionProvider, FileSystemWatcher, Uri, workspace} from 'vscode';
import {CacheManager, YamlParser} from './services';
import {YamlDefinitionProvider} from './providers';

export default class App {
    private static _instance: App;
    private _cacheManager: CacheManager;
    private _yamlParser: YamlParser;

    private constructor() {
        this._cacheManager = new CacheManager();
        this._yamlParser = new YamlParser();
    }

    public static get instance(): App {
        if (!this._instance) {
            this._instance = new this();
        }

        return this._instance;
    }

    public get cacheManager(): CacheManager {
        return this._cacheManager;
    }

    public get yamlParser(): YamlParser {
        return this._yamlParser;
    }

    public get providers(): Array<{selector: Object, provider: DefinitionProvider}> {
        return [
            {
                selector: {language: 'yaml'},
                provider: new YamlDefinitionProvider(),
            },
        ];
    }

    public get watchers(): Array<{watcher: FileSystemWatcher, handler: any}> {
        return [
            {
                watcher: workspace.createFileSystemWatcher('**/*.{yml,yaml}'),
                handler: async (uri: Uri) => {
                    App.instance.cacheManager.invalidateFile(uri);
                    await App.instance.yamlParser.processDocument(await workspace.openTextDocument(uri));
                },
            },
        ];
    }
}
