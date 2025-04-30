import {Location, Uri} from 'vscode';

export class CacheManager {
    private _cache = new Map<string, Location>();
    private _history = new Map<string, Location[]>();
    private _fileToParams = new Map<string, Set<string>>();

    cacheParam(paramName: string, location: Location) {
        if (!this._history.has(paramName)) {
            this._history.set(paramName, []);
        }

        this._history.get(paramName)!.push(location);
        this._cache.set(paramName, location);

        const fileUri = location.uri.toString();
        if (!this._fileToParams.has(fileUri)) {
            this._fileToParams.set(fileUri, new Set());
        }

        this._fileToParams.get(fileUri)!.add(paramName);
    }

    invalidateFile(fileUri: Uri) {
        const fileKey = fileUri.toString();
        const paramsInFile = this._fileToParams.get(fileKey);
        if (paramsInFile) {
            paramsInFile.forEach((paramName) => {
                const locations = this._history.get(paramName) || [];
                const updatedLocations = locations.filter((loc) => loc.uri.toString() !== fileKey);

                this._history.set(paramName, updatedLocations);

                if (updatedLocations.length > 0) {
                    this._cache.set(paramName, updatedLocations[updatedLocations.length - 1]);
                } else {
                    this._cache.delete(paramName);
                }
            });

            this._fileToParams.delete(fileKey);
        }
    }

    getParamDefinition(paramName: string): Location|undefined {
        return this._cache.get(paramName);
    }
}
