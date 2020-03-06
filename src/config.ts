import FS from 'fs';
import PATH from 'path';

const workPath = PATH.basename(__dirname) === 'out' ? PATH.dirname(__dirname) : __dirname;
/**
 * 根据输入参数 返回 一个绝对路径
 * @param path 
 */
export const GetPath = (...path: string[]) => {
    if (path.length == 0) return workPath;
    if (PATH.isAbsolute(path[0])) {
        return PATH.resolve.apply(null, path);
    }
    return PATH.resolve.apply(null, [workPath, ...path]);
}
