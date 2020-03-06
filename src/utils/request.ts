import FS from 'fs';
import PATH from 'path';
import URL from 'url';
import { default as HTTP } from 'http';
import { default as HTTPS } from 'https';
import fetch from 'node-fetch';

export interface IAction {
    /**
     * 路径参数
     */
    path: string;
    /**
     * HTTP请求方法
     */
    method: 'get' | 'post' | 'delete' | 'put';
    /**
     * 服务
     */
    service: string;
    /**
     * 如果指定了这个 则忽略 service
     */
    host?:string;
}
export interface IActionOptions {
    query?: string | { [key: string]: any };
    path?: { [key: string]: any };
    headers?: any;
    body?: any;
    noContentType?: boolean;
}

interface IUserInfo {
    userId: number;
    name: string;
    email: string;
    mobile: string;
    userType: number;
    userLevel: number;
    token: string;
}
let userInfo: IUserInfo;
// default setting for fetch
const defaultSettings = {
    headers: {
        'content-type': 'application/json'
    },
    'mode': 'cors',
    'cache': 'no-cache'
};
let environ = 'LOC';
const setEnv=(env:string)=>{ environ = env;}
let ipAddress: string;
const getIpaddress = async () => {
    if (ipAddress) return ipAddress;
    const url = 'http://2019.ip138.com/ic.asp';
    try {
        const res = await fetch(url);
        if (res.status == 200) {
            const content = await res.text();
            var m = /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/g.exec(content);
            if (m)
                ipAddress = m[1];
        }
        return ipAddress;
    } catch{
        return '';
    }
}
const getFormatToken = (token: string) => {
    return { Authorization: `Bearer ${token}` };
}
const createAPIHost = (action: IAction) => {
    switch(environ){
        case 'SIT':return `https://${action.service}.api.depoga.net`;
        case 'PRD':return `https://${action.service}.api.depoga.com`;
    }
    return `https://${action.service}.api.depoga.net`;
}
const createUrl = (action: IAction, settings: IActionOptions) => {
    const host = action.host || createAPIHost(action);
    let path = action.path;
    let queryString = '';
    if (settings.query) {
        const query = settings.query;
        if (query && typeof query === 'string') {
            queryString = query.replace(/^\?+/, '');
        } else if (query && typeof query === 'object') {
            queryString = Object.keys(query).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
        }
    }
    if (settings.path) {
        let match: RegExpMatchArray | null;
        const reg = /\{(.+?)\}/ig;
        while (match = reg.exec(path)) {
            if (settings.path[match[1]] != undefined) {
                path = path.replace(`{${match[1]}}`, settings.path[match[1]]);
            }
        }
    }
    return `${host}/api/v1/${path}` + (queryString ? `?${queryString}` : '');

};
const createRequestData = (action: IAction, settings: IActionOptions, requireToken: boolean) => {
    const url = createUrl(action, settings);

    let fetchSettings: any = {
        ...defaultSettings,
        ...settings,
        url,
        'method': action.method
    };

    // toString
    if (settings) {
        if (settings.headers) {
            fetchSettings.headers = {
                ...defaultSettings.headers,
                ...settings.headers
            };
        }
        // to Json String
        if (settings.body && typeof settings.body === 'object') {
            fetchSettings.body = JSON.stringify(settings.body);
        }
    }

    if (requireToken) {
        fetchSettings.headers = {
            ...fetchSettings.headers,
            ...getFormatToken(userInfo.token),
        }
    }
    if (settings.noContentType) {
        delete (fetchSettings.headers['content-type']);
    }

    return fetchSettings;
};
//*
async function uploadFile(action: IAction, query: { [key: string]: string }, formData: { [key: string]: string }, toUploadFiles: { key: string, path: string }[]) {
    if (!userInfo)
        await userLogin('99999999999', '99999999999');
    return new Promise((resolve, reject) => {
        const urlToDownload = createUrl(action, { query });
        let uri = new URL.URL(urlToDownload);
        let httpClient = uri.protocol == 'https:' ? HTTPS : HTTP;
        const options = {
            method: 'POST',
            hostname: uri.host,
            path: uri.search ? `${uri.pathname}${uri.search}` : uri.pathname,
            headers: {
                //'Content-Type': 'text/plain'
                ...getFormatToken(userInfo.token)
            }
        };
        let s = '';
        let r = httpClient.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('error', (err) => {
                reject({
                    success: false,
                    cod: res.statusCode,
                    message: res.statusMessage,
                    body: s, err
                });
            });
            res.statusCode,
                res.statusMessage
            res.on('data', (chunk) => {
                s += chunk;
            });
            res.on('end', () => {
                resolve({ res, body: s });
            });
        });
        r.on('error', (err) => {
            reject({ success: false, code: 0x99999, message: 'unknown error', body: s, err });
        });
        //r.end();
        postFile(r, formData, toUploadFiles);
    }).then((result: any) => {
        //return { success: false, message: err.message, code: 0x99999, err, begin: t1, end: t2 }
        let success = result.res.statusCode == 200;
        let jsonBody = null;
        const r = {
            code: result.res.status,
            //begin: t1,
            //end: t2
        };
        try {
            jsonBody = JSON.parse(result.body);
            return fixResult(r, jsonBody);
        } catch{
            success = false;
        }

        return {
            success,
            code: result.res.statusCode,
            message: result.res.statusMessage,
        }
    });
}

function postFile(req:HTTP.ClientRequest, formData: { [key: string]: string }, toUploadFiles: { key: string, path: string }[]) {
    const boundaryKey = Math.random().toString(16);
    const enddata = '\r\n----' + boundaryKey + '--';

    let dataLength = 0;
    const dataArr = new Array();
    for (const key in formData) {
        const value = formData[key];
        const dataInfo = '\r\n----' + boundaryKey + '\r\n' + 'Content-Disposition: form-data; name="' + key + '"\r\n\r\n' + value;
        const dataBinary = Buffer.from(dataInfo, "utf-8");
        dataLength += dataBinary.length;
        dataArr.push({
            dataInfo: dataInfo
        });
    }

    const files = new Array();
    for (let i = 0; i < toUploadFiles.length; i++) {
        const fileItem = toUploadFiles[i];
        const content = '\r\n----' + boundaryKey + '\r\n'
            + 'Content-Type: application/octet-stream\r\n'
            + 'Content-Disposition: form-data; name="' + fileItem.key + '"; filename="' + PATH.basename(fileItem.path) + '"\r\n'
            + 'Content-Transfer-Encoding: binary\r\n\r\n';
        const contentBinary = Buffer.from(content, 'utf-8'); //当编码为ascii时，中文会乱码。
        files.push({
            contentBinary: contentBinary,
            filePath: fileItem.path
        });
    }
    let contentLength = 0;
    for (let i = 0; i < files.length; i++) {
        const filePath = files[i].filePath;
        if (FS.existsSync(filePath)) {
            const stat = FS.statSync(filePath);
            contentLength += stat.size;
        } else {
            contentLength += Buffer.from("\r\n", 'utf-8').length;
        }
        contentLength += files[i].contentBinary.length;
    }

    req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
    req.setHeader('Content-Length', dataLength + contentLength + Buffer.byteLength(enddata));

    // 将参数发出
    for (let i = 0; i < dataArr.length; i++) {
        req.write(dataArr[i].dataInfo)
        //req.write('\r\n')
    }

    let fileindex = 0;
    const doOneFile = () => {
        req.write(files[fileindex].contentBinary);
        const currentFilePath = files[fileindex].filePath;
        if (FS.existsSync(currentFilePath)) {
            const fileStream = FS.createReadStream(currentFilePath);
            fileStream.pipe(req, { end: false });
            fileStream.on('end', () => {
                fileindex++;
                if (fileindex == files.length) {
                    req.end(enddata);
                } else {
                    doOneFile();
                }
            });
        } else {
            req.write("\r\n");
            fileindex++;
            if (fileindex == files.length) {
                req.end(enddata);
            } else {
                doOneFile();
            }
        }
    };
    if (fileindex == files.length) {
        req.end(enddata);
    } else {
        doOneFile();
    }
}
//*/
const fixResult = (result: any, r: any) => {
    if (r.hasOwnProperty('data')) {
        return {
            ...r,
            ...result,
        }
    } else if (Array.isArray(r)) {
        return {
            success: true,
            message: '',
            data: r,
            ...result,
        }
    }
    const { success, message, ...data } = r;
    return {
        success: success || true,
        message: message || '',
        data,
        ...result,
    }
}
export const request = async (action: IAction, options: IActionOptions, requireToken = false) => {
    if (requireToken && !userInfo) {
        //await userLogin('13590650080', 'q2926219');
        await userLogin('99999999999', '99999999999');
    }
    const data = createRequestData(action, options, requireToken);
    const {
        url,
        ...settings
    } = data;
    let t1, t2;
    try {
        t1 = new Date();
        console.log(action.method, url);
        const res = await fetch(url, settings);
        t2 = new Date();
        const result = {
            code: res.status,
            begin: t1,
            end: t2
        };
        switch (res.status) {
            case 200:
            case 400:
            case 404:
                try {
                    const r = await res.json();
                    return fixResult(result, r);
                } catch (err) {
                    return { success: false, message: err.message, err, ...result }
                }
            case 500:
                //console.log(await res.text())
                return { success: false, message: res.statusText, ...result }
            case 403:
            case 503:
                return { success: false, message: res.statusText, ...result }
        }
        try {
            const r = await res.json();
            return {
                ...r,
                code: res.status,
                begin: t1,
                end: t2
            }
        } catch (err) {
            return { success: false, message: err.message, err, ...result }
        }
    } catch (err) {
        // throw err;
        return { success: false, message: err.message, code: 0x99999, err, begin: t1, end: t2 }
    }
};

/**
 * 获取所有素材分类
 *
 * @export
 * @param {*} options
 * @returns
 */
export async function getAssetCategories() {
    return await request(
        {
            service: 'product',
            method: 'get',
            path: 'Asset/GetAssetCategoryList'
        }
        , {});
}

export const GetTechnologyList = async () =>
    await request(
        {
            service: 'product',
            method: 'get',
            path: 'Asset/GetTechnologyList'
        }
        , {});
/**
 * 获取素材/商品/产品可推荐位置
 *
 * @returns
 */
export const getRecommendPosition = async () =>
    await request(
        {
            service: 'product',
            method: 'get',
            path: 'Asset/GetRecommendPositionAsset'
        }
        , {});

/**
 * 上传素材文件
 *
 * @returns
 */
export const uploadAssetFile = async (
    query: { [key: string]: string },
    formData: { [key: string]: string },
    toUploadFiles: { key: string, path: string }[]) =>
    await uploadFile({
        service: 'product',
        method: 'post',
        path: 'Asset/UploadFile'
    }, query, formData, toUploadFiles);

/**
 * 添加素材分类
 *
 * @export
 * @param {string} categoryName
 * @returns
 */
export const addAssetCategory = async (categoryName: string) =>
    await request({
        service: 'product',
        method: 'post',
        path: 'Asset/CreateAssetCategory'
    }, { body: { categoryName } }, true);

/**
 * 添加/修改素材
 *
 * @export
 * @param {*} options
 * @returns
 */
export const addEditAsset = async (options: IActionOptions) =>
    await request(
        {
            service: 'product',
            method: 'post',
            path: 'Asset/UpdateAsset'
        }
        , { ...options }, true);

export const exportGenerateExcel = async (options: IActionOptions, host?: string) =>
    await request({
        service: 'platform',
        method: 'post',
        path: 'export/GenerateExcel',
        host
    }, {
            ...options
        }, true);
export const generateOrder = async (options: IActionOptions, host?: string) =>
    await request({
        service: 'platform',
        method: 'post',
        path: 'import/GenerateOrder',
        host
    }, {
            ...options
        }, true);
/**
 * @description User/Login登陆
 * @export
 * @param {string} account 账户
 * @param {string} password 密码 
 * @returns 
 */
export const userLogin = async (account: string, password: string) => {
    const r = await request({
        service: 'user',
        path: 'User/Login',
        method: 'post'
    }, {
            body: {
                account,
                password,
                ipAddress: await getIpaddress()
            }
        });
    if (r.success) {
        userInfo = r.data;
    }
    return r;
}
