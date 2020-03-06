import { MySQL, fixCatch } from 'x-mysql-ssh';
import { getCache, setCache } from '../utils/cache';
import { It_products, It_propvalue, It_product_skus, IProductDiyArea } from './tables';
import { isEmptyOrNull } from '../utils/string';


const timeout = 864000;
export const getAllProducts = async (db: MySQL, useCache = true) => {
    const cacheKey = 'products';
    let list = useCache ? getCache<It_products[]>(cacheKey) : null;
    if (list != null) {
        return list;
    }
    const r = await db.query('SELECT * FROM t_products').catch(fixCatch);
    setCache(cacheKey, r.Result.map((item: any) => {
        return item;
    }), timeout);
    return <It_products[]>r.Result;
}
const getAllPropValues = async (db: MySQL, useCache = true) => {
    const cacheKey = 'AllPropValues';
    let list = useCache ? getCache<It_propvalue[]>(cacheKey) : null;
    if (list != null) {
        return list;
    }
    const r = await db.query('SELECT * FROM t_propvalue').catch(fixCatch);
    setCache(cacheKey, r.Result.map((item: any) => {
        return item;
    }), timeout);
    return <It_propvalue[]>r.Result;
}
type propValue = { prop: number, value: number }
type fixPropValue = {
    type: number,
    code: string,
    title: string,
    color: string,
};
type ProSku = {
    id:number,
    productId: number,
    price:number,
    cost:number,
    sku:string,
    color:string,
    size:string,
    /**
     * 克重（g）
     */
    weight:number;
    /**
     * 安全库存
     */
    safeQty:number;
}
export type ProductSku = {
    id: number,
    code: string,
    title: string,
    skuId:number,
    sku: string,
    diyArea:IProductDiyArea[],
    price: number,
    color: {
        title: string,
        code: string,
        color_hex: string,
        color_rgb: string
    },
    size: {
        title: string,
        code: string
    }
};
const getCssColor = (s: string) => {
    if (isEmptyOrNull(s)) return '';
    s = s.split(',').pop() || '';
    return `#${s.padStart(6, '0')}`;
}
const getRgbColor = (s: string) => {
    const css = getCssColor(s);
    if (!css) return '';
    return `rgb(${parseInt(css.substr(1, 2), 16)} ${parseInt(css.substr(3, 2), 16)} ${parseInt(css.substr(5, 2), 16)})`;
}
async function getDiyArea(db: MySQL, productId:number, useCache = true){
    const cacheKey = 't_product_diy_area';
    let list = useCache ? getCache<IProductDiyArea[]>(cacheKey) : null;
    if (list != null) {
        return list.filter(ppp=>ppp.product_id == productId);
    }
    const r = await db.query('SELECT distinct DA.*, P.title AS productTitle,P.barcode, P.origin_barcode '
                            + ' FROM t_product_diy_area AS DA '
                            + ' JOIN t_products AS P ON P.id = DA.product_id'
                            //+' WHERE DA.product_id =?'
                            //, productId
    ).catch(fixCatch);
    
    const proList = r.Result.filter(ppp=>ppp.product_id == productId);
    if(r.Result.length > 0){
        setCache(cacheKey, r.Result, timeout);
    }
    return <IProductDiyArea[]>proList;
}
export const updateData = async (db: MySQL) => {
    const allProducts = await getAllProducts(db, false);
    const allPropValues = await getAllPropValues(db, false);
    const allDiyArea = await getDiyArea(db, allProducts[0].id, false);
    return {
        products:allProducts.length,
        propValues:allPropValues.length,
        diyArea: allDiyArea.length
    }
}
export async function getSkuList(db: MySQL, productId: number, useCache = true){
    const cacheKey = `sku_pro:${productId}`;
    let list = useCache ? getCache<ProSku[]>(cacheKey) : null;
    if (list != null) {
        return list;
    }
    const r = await db.query('SELECT distinct sku.* FROM t_product_skus AS sku  WHERE sku.product_id =?', productId);
    if(r.Success && r.Result.length > 0){
        const allPropValues = await getAllPropValues(db, true);
        const fixList = r.Result.map((sku:It_product_skus)=>{
            const returnValue:ProSku = {
                id:sku.id,
                productId: sku.product_id,
                price:sku.price,
                cost:sku.cost,
                sku:sku.sku_sn,
                weight:sku.weight,
                safeQty:sku.safe_qty,
                color:'',
                size:'',
            };
            JSON.parse(sku.sku_json).map((item: propValue) => {
                const df: fixPropValue = {
                    type: 0,
                    code: '',
                    title: '',
                    color: '',
                };
                const propValue = allPropValues.filter(pv => pv.id == item.value && pv.propkey_id == item.prop).pop();
                if (propValue === undefined) return df;
                switch (item.prop.toString()) {
                    case '1':
                        return {
                            type: 1,
                            code: propValue.code,
                            title: propValue.propvalue,
                            color: propValue.color_hex_value,
                        }
                    case '2':
                    case '20':
                    case '21':
                    case '22':
                        return {
                            ...r,
                            type: 2,
                            code: propValue.code,
                            title: propValue.propvalue
                        }
                }
                return df;
            })
            .filter((item:fixPropValue)=>item.type>0)
            .forEach((item: fixPropValue) => {
                switch (item.type) {
                    case 1:
                        returnValue.color = item.title;
                        break;
                    case 2:
                        returnValue.size = item.title;
                        break;
                }
            });
            return returnValue;
        });
        setCache(cacheKey, fixList, timeout);
        return <ProSku[]>fixList;
    }
    return [];
}
export const getProductSku = async (db: MySQL, productId: number, inventory:boolean, useCache = true): Promise<ProductSku[]> => {
    // const cacheKey = `product-sku-${productId}`;
    const allProducts = await getAllProducts(db, useCache);
    const product = allProducts.filter(p => p.id == productId).pop();
    if (product === undefined) { throw new Error(`找不到产品：${productId}${useCache ? ' 请尝试清除缓存试试！' : ''}`) }
    //'SELECT * FROM `t_stock_items` WHERE `order_id` IN (151,152,153)'
    // const r = await db.query('SELECT sku.* FROM t_product_skus AS sku JOIN t_stock_items AS si ON si.sku_sn = sku.sku_sn WHERE sku.product_id =? AND si.order_id IN (151,152,153, 175,190)', productId);
    const r = inventory 
            ? (await db.query('SELECT distinct sku.* FROM t_product_skus AS sku JOIN t_stock_items AS si ON si.sku_sn = sku.sku_sn WHERE sku.product_id =?', productId))
            : (await db.query('SELECT distinct sku.* FROM t_product_skus AS sku  WHERE sku.product_id =?', productId));
    if (!r.Success) {
        return [];
    }
    const allPropValues = await getAllPropValues(db, useCache);
    const allDiyArea = await getDiyArea(db, productId, useCache);

    if(allDiyArea==null || allDiyArea.length < 1){
        throw new Error(`找不到产品：“${productId}”的定制区域设置，${useCache ? ' 请尝试清除缓存试试！' : ''}`);
    }
    
    const list = r.Result.map((pro: It_product_skus) => {
        const returnValue = {
            id: pro.product_id,
            code: product.barcode,
            title: product.title,
            skuId: pro.id,
            sku: pro.sku_sn,
            diyArea: allDiyArea.filter(area => area.skuId == pro.id || area.skuId == 0),
            price: pro.price,
            color: {
                title: '',
                code: '',
                color_hex: '',
                color_rgb: ''
            },
            size: {
                title: '',
                code: ''
            }
        };
        const skus: propValue[] = JSON.parse(pro.sku_json)
            .map((item: propValue) => {
                const propValue = allPropValues.filter(pv => pv.id == item.value && pv.propkey_id == item.prop).pop();
                const df: fixPropValue = {
                    type: 0,
                    code: '',
                    title: '',
                    color: '',
                };
                if (propValue === undefined) return df;
                switch (item.prop.toString()) {
                    case '1':
                        return {
                            type: 1,
                            code: propValue.code,
                            title: propValue.propvalue,
                            color: propValue.color_hex_value,
                        }
                    case '2':
                    case '20':
                    case '21':
                        return {
                            ...r,
                            type: 2,
                            code: propValue.code,
                            title: propValue.propvalue
                        }
                }
                return df;
            })
            .filter((item: fixPropValue)=>item.type > 0)
            .forEach((item: fixPropValue) => {
                switch (item.type) {
                    case 1:
                        returnValue.color.code = item.code;
                        returnValue.color.title = item.title;
                        returnValue.color.color_hex = getCssColor(item.color);
                        returnValue.color.color_rgb = getRgbColor(item.color);
                        break;
                    case 2:
                        returnValue.size.code = item.code;
                        returnValue.size.title = item.title;
                        break;
                }
            });
        return returnValue;
    });
    return list;
}