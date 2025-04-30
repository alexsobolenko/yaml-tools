import {Location, Uri} from 'vscode';

export class CacheManager {
    private cache = new Map<string, Location>();
    private history = new Map<string, Location[]>();
    private fileToParams = new Map<string, Set<string>>();

    cacheParam(paramName: string, location: Location) {
        if (!this.history.has(paramName)) {
            this.history.set(paramName, []);
        }

        this.history.get(paramName)!.push(location);
        this.cache.set(paramName, location);

        const fileUri = location.uri.toString();
        if (!this.fileToParams.has(fileUri)) {
            this.fileToParams.set(fileUri, new Set());
        }

        this.fileToParams.get(fileUri)!.add(paramName);
    }

    invalidateFile(fileUri: Uri) {
        const fileKey = fileUri.toString();
        const paramsInFile = this.fileToParams.get(fileKey);
        if (paramsInFile) {
            paramsInFile.forEach((paramName) => {
                const locations = this.history.get(paramName) || [];
                const updatedLocations = locations.filter((loc) => loc.uri.toString() !== fileKey);

                this.history.set(paramName, updatedLocations);

                if (updatedLocations.length > 0) {
                    this.cache.set(paramName, updatedLocations[updatedLocations.length - 1]);
                } else {
                    this.cache.delete(paramName);
                }
            });

            this.fileToParams.delete(fileKey);
        }
    }

    getParamDefinition(paramName: string): Location|undefined {
        return this.cache.get(paramName);
    }
}
