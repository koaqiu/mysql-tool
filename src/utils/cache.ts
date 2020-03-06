import FS from 'fs';
import PATH from 'path';
import { GetPath } from '../config';
import { Md5 } from './crypto';
import { isEmptyOrNull } from './string';

interface ICacheItem<T> {
    /**
     * 数据
     */
    data: T;
    /**
     * 关键字
     */
    key: string;
    /**
     * 过期时间
     * Date.getTime()
     */
    expire: number;
    /**
     * 过期时间（给人看的）
     */
    expireTime:string;
    /**
     * 依赖项目
     */
    dependencies: string[];
}
let __ns = '';
let cachePath = GetPath('data','cache', __ns);
const getCacheItemFile = (key: string) => { 
    if(!FS.existsSync(cachePath)) 
        FS.mkdirSync(cachePath, { recursive: true });
    return PATH.join(cachePath,`${Md5(key)}.json`);
}
/**
 * 移除缓存
 * @param key 关键字
 */
export const removeCache = (key:string) =>{
    const file = getCacheItemFile(key);
    if (FS.existsSync(file)){
        FS.unlinkSync(file);
    }
}
/**
 * 读取缓存，如果不存在或者已经过期返回null
 * @param key 关键字
 */
export const getCache = <T>(key: string): T | null => {
    const file = getCacheItemFile(key);
    if (!FS.existsSync(file)) return null;
    const json = FS.readFileSync(file).toString();
    const cache = <ICacheItem<T>>JSON.parse(json);
    if (cache.expire < (new Date).getTime()) {
        FS.unlinkSync(file);
        return null;
    };
    return cache.data;
}
/**
 * 设置缓存，如果关键字已经存在会直接覆盖
 * @param key 关键字
 * @param data 数据
 * @param timeout 超时时间（单位：秒）
 */
export const setCache = (key: string, data: any, timeout: number = 3600) => {
    if(isEmptyOrNull(key)) throw new Error('无效的Key');
    if (timeout < 1) timeout = 3600;
    const file = getCacheItemFile(key);
    const expire = (new Date).getTime() + timeout * 1000;
    const json = JSON.stringify({
        key, 
        data, 
        expire,
        expireTime: (new Date(expire)).toLocaleString(),
        dependencies:[]
    }, null, '\t');
    FS.writeFileSync(file, json);
    return data;
}

export const setCacheNameSpace=(ns:string)=>{
    __ns = ns;
    cachePath = GetPath('data','cache', __ns);
}