import path from 'path';

export function resolvePath(basePath: string, relativePath: string): string {
    return path.resolve(path.dirname(basePath), relativePath);
}
