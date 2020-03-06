export interface It_propvalue {
    /**
    * 
    */
    id: number;
    /**
    * 编码
    */
    code: string;
    /**
    * 属性id
    */
    propkey_id: number;
    /**
    * 
    */
    sort_weight: number;
    /**
    * 
    */
    propvalue: string;
    /**
    * 颜色16进制值，最多4组，可以逗号分隔
    */
    color_hex_value: string;
    /**
    * 是否删除
    */
    is_deleted: number;
    /**
    * 创建时间
    */
    create_time: number;
    /**
    * 修改时间
    */
    update_time: number;
}

export interface It_products {
    /**
    * 
    */
    id: number;
    /**
    * 品名
    */
    title: string;
    /**
    * 卖点
    */
    seller_point: string;
    /**
    * 是否上架,1是,0不是
    */
    is_online: number;
    /**
    * 列表中的标准价
    */
    listing_price: number;
    /**
    * 所在后台的类目
    */
    catalog_id: number;
    /**
    * 排序权重
    */
    sort_weight: number;
    /**
    * 商品编码
    */
    barcode: string;
    /**
    * 原厂编码
    */
    origin_barcode: string;
    /**
    * 属性集合ID
    */
    propset_id: number;
    /**
    * 是否删除
    */
    is_deleted: number;
    /**
    * 创建时间
    */
    create_time: number;
    /**
    * 修改时间
    */
    update_time: number;
    /**
    * 
    */
    ref_product_id: number;
    /**
    * 安全库存
    */
    safe_qty: number;
    /**
    * 所有者ID
    */
    owner_id: number;
}

export interface It_product_skus {
    /**
    * 
    */
    id: number;
    /**
    * 商品id
    */
    product_id: number;
    /**
    * 商品某一条SKU规格
    */
    sku_json: string;
    /**
    * 售价
    */
    price: number;
    /**
    * 成本
    */
    cost: number;
    /**
    * 原厂SKU ID
    */
    original_sku_id: string;
    /**
    * SKU编码
    */
    sku_sn: string;
    /**
     * 克重（g）
     */
    weight:number;
    /**
     * 安全库存
     */
    safe_qty:number;
}

export interface It_product_diy_area {
    /**
    * 
    */
    id: number;
    skuId: number;
    /**
    * 商品id
    */
    product_id: number;
    title: string;
    width: number;
    height: number;
    left: number;
    top: number;
    platform_width: number;
    platform_height: number;
    platform_top: number;
    platform_name: number;
    /**
     * 直喷-1
     * 刺绣-2
     * 热转印-3
     */
    technology:number;
}

export interface IProductDiyArea extends It_product_diy_area {
    origin_barcode: string;
    barcode: string;
    productTitle: string;
}