import * as Cesium from "cesium"
import { instance } from "../api";

class cesiumUtils{
    viewer: Cesium.Viewer
    constructor(container: HTMLElement) {
        this.viewer = new Cesium.Viewer(container, {
            infoBox: false, // 解决iframe无法执行js报错问题
            baseLayerPicker: false, // 去掉底图选择器
            sceneModePicker: false, // 去掉场景模式选择器 （3D，2D）
            homeButton: false, // 去掉起始点按钮
            geocoder: false, // 去掉地理代码搜索
            navigationHelpButton: false, // 去掉导航帮助按钮
            animation: false, // 取消动画按钮
            timeline: false, // 去掉时间线
            fullscreenButton: false, // 去掉全屏按钮
            selectionIndicator: false, // 去掉选择指示器
            vrButton: true,
            imageryProvider: new Cesium.TileMapServiceImageryProvider({ // 使用请求量少的图片瓦片地图提供者减少不必要的底图请求，避免网络不好时导致整个地球出不来
                url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
            })
      });
      (this.viewer.cesiumWidget.creditContainer as HTMLDivElement).style.display = 'none'; // 去掉cesium的左下角logo区域
    }

    /**
     * 以geojson加载服务
     */
    loadGeojsonServer() {
        Cesium.GeoJsonDataSource.load(
            "http://localhost:9999/geoserver/ranqiguanxian/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ranqiguanxian%3Aranqi&maxFeatures=50&outputFormat=application%2Fjson"
        ).then((GeoJsonDataSource) => {
            console.log(GeoJsonDataSource);
            this.viewer.dataSources.add(GeoJsonDataSource);
            this.viewer.flyTo(GeoJsonDataSource);
            var handlerCli = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
            handlerCli.setInputAction((movement: any) => {
                var pick = this.viewer.scene.pick(movement.position);
                if (Cesium.defined(pick)) {
                    console.log(pick.id.properties);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        });
    }

    /**
     * 以WMS加载服务
     */
    loadWMSServer() {
        const imageryProvider = new Cesium.WebMapServiceImageryProvider({
            url : 'http://localhost:9999/geoserver/pgsql-guanxian/wms',
            layers : 'pgsql-guanxian:ranqi',
            parameters : {
                service: "WMS",
                transparent : true,     //是否透明
                format : 'image/png',
                srs: 'EPSG:4326',
            }
        })
        this.viewer.imageryLayers.addImageryProvider(imageryProvider);
        this.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(114.0600788, 22.5771387, 1000)
        });

    }

    /**
     * 测试geoserver的信息查询
     */
    testFeature() {
        this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
                114.05610501766205,
                22.577893696725372,
                1
            ),
    
            point: {
              pixelSize: 10,
    
              color: Cesium.Color.YELLOW,
            },
          });
          this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
                114.05617274343967,
                22.577961422502998,
                1
            ),
    
            point: {
              pixelSize: 10,
    
              color: Cesium.Color.YELLOW,
            },
          });
    }

    /**
     * 面积测量
     * @param viewer 
     */
    measurePolygn(viewer: Cesium.Viewer) {
        // 鼠标事件
        var handler = new Cesium.ScreenSpaceEventHandler((viewer.scene as any)._imageryLayerCollection);
        var positions: any[] = [];
        var tempPoints: { lon: number; lat: number; hei: number; }[] = [];
        var polygon = null;
        var cartesian = null;
        var floatingPoint;//浮动点
        handler.setInputAction(function (movement: { endPosition: Cesium.Cartesian2; }) {
            let ray = viewer.camera.getPickRay(movement.endPosition);
            cartesian = viewer.scene.globe.pick(ray as Cesium.Ray, viewer.scene);
            positions.pop();//移除最后一个
            positions.push(cartesian);
            if (positions.length >= 2) {
                var dynamicPositions = new Cesium.CallbackProperty(function () {
                    return new Cesium.PolygonHierarchy(positions);
                    return positions;
                }, false);
                polygon = PolygonPrimitive(dynamicPositions);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    
        handler.setInputAction(function (movement: { position: Cesium.Cartesian2; }) {
            let ray = viewer.camera.getPickRay(movement.position);
            cartesian = viewer.scene.globe.pick(ray as Cesium.Ray, viewer.scene);
            if (positions.length == 0) {
                positions.push((cartesian as Cesium.Cartesian3).clone());
            }
            positions.push(cartesian);
            //在三维场景中添加点
            var cartographic = Cesium.Cartographic.fromCartesian(positions[positions.length - 1]);
            var longitudeString = Cesium.Math.toDegrees(cartographic.longitude);
            var latitudeString = Cesium.Math.toDegrees(cartographic.latitude);
            var heightString = cartographic.height;
            var labelText = "(" + longitudeString.toFixed(2) + "," + latitudeString.toFixed(2) + ")";
            tempPoints.push({ lon: longitudeString, lat: latitudeString, hei: heightString });
            floatingPoint = viewer.entities.add({
                name: '多边形面积',
                position: positions[positions.length - 1],
                point: {
                    pixelSize: 5,
                    color: Cesium.Color.RED,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                    text: labelText,
                    font: '18px sans-serif',
                    fillColor: Cesium.Color.GOLD,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    outlineWidth: 2,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(20, -20),
                }
            });
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction(function (movement: any) {
            handler.destroy();
            positions.pop();
            var textArea = getArea(tempPoints) + "平方公里";
            console.log(positions);

            const car3toCartographic = (cartesian3: Cesium.Cartesian3) => {  
                const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian3);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lng: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height
                }
            }

            let positionStr = ''
            let firstStr = ''
            positions.map((position) => {
                return car3toCartographic(position);
            }).forEach((coord, index) => {
                console.log(coord);
                if(index === 0) {
                    positionStr = positionStr.concat(`${coord.lng} ${coord.lat}`);
                    firstStr = positionStr;
                }else{
                    positionStr = positionStr.concat(`,${coord.lng} ${coord.lat}`)
                }
            })
            positionStr = positionStr.concat(`, ${firstStr}`);
            // http://localhost:8888/geoserver/pgsql-guanxian/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=pgsql-guanxian%3Aranqi&maxFeatures=50&outputFormat=application%2Fjson
            instance.get(`http://localhost:9999/geoserver/pgsql-guanxian/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=pgsql-guanxian:ranqi&maxFeatures=1000&outputFormat=application/json&cql_filter=INTERSECTS(Shape,POLYGON((${positionStr})))`).then((data) => {
                console.log(data.data);
                const pipe = {
                    code: 200,
                    success: true,
                    data: [] as any[],
                    msg: "操作成功"
                }
                // 将所有的属性对象放入pipe对象,这个时候还不能加入subList是因为有可能他的父级在他后面出来
                data.data.features.forEach((feature: any) => {
                    const obj = feature.properties;
                    obj.subList = [];
                    pipe.data.push(obj);
                })
                // 遍历pipe.data把对象们拿出来准备插入父级了
                pipe.data.forEach((obj) => {
                    const connectCode: string = obj.connectCode;
                    // 查找与其相连的观点放入他的subList里面
                    connectCode.split(',').forEach((connectCode: string) => {
                        pipe.data.forEach((searchCCodeObj) => {
                            if(searchCCodeObj.code === connectCode){
                                const cloneSearchCCodeObj = {
                                    ...searchCCodeObj
                                }
                                cloneSearchCCodeObj.subList = [];
                                obj.subList.push(cloneSearchCCodeObj);
                            }
                        })
                    })
                })
                console.log(pipe);
                const isSave = window.confirm("是否保存结果？");
                if(isSave) {
                    const text = JSON.stringify(pipe);
                    const blob = new Blob([text], {type: "text/plain"})
                    const link = document.createElement("a")
                    link.href = URL.createObjectURL(blob)
                    link.download = "test.csb" // 这里填保存成的文件名
                    link.click()
                    URL.revokeObjectURL(link.href)
                    console.log('保存成功', pipe);
                }
            })
            console.log(positionStr);

            viewer.entities.add({
                name: '多边形面积',
                position: positions[positions.length - 1],
                label: {
                    text: textArea,
                    font: '18px sans-serif',
                    fillColor: Cesium.Color.GOLD,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    outlineWidth: 2,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(20, -40),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            });
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        var radiansPerDegree = Math.PI / 180.0;//角度转化为弧度(rad)
        var degreesPerRadian = 180.0 / Math.PI;//弧度转化为角度
        //计算多边形面积
        function getArea(points: string | any[]) {
            var res = 0;
            //拆分三角曲面
            for (var i = 0; i < points.length - 2; i++) {
                var j = (i + 1) % points.length;
                var k = (i + 2) % points.length;
                var totalAngle = Angle(points[i], points[j], points[k]);
                var dis_temp1 = distance(positions[i], positions[j]);
                var dis_temp2 = distance(positions[j], positions[k]);
                res += dis_temp1 * dis_temp2 * Math.abs(Math.sin(totalAngle));
            }
            return (res / 1000000.0).toFixed(4);
        }
    
        /*角度*/
        function Angle(p1: any, p2: any, p3: any) {
            var bearing21 = Bearing(p2, p1);
            var bearing23 = Bearing(p2, p3);
            var angle = bearing21 - bearing23;
            if (angle < 0) {
                angle += 360;
            }
            return angle;
        }
        /*方向*/
        function Bearing(from: { lat: number; lon: number; }, to: { lat: number; lon: number; }) {
            var lat1 = from.lat * radiansPerDegree;
            var lon1 = from.lon * radiansPerDegree;
            var lat2 = to.lat * radiansPerDegree;
            var lon2 = to.lon * radiansPerDegree;
            var angle = -Math.atan2(Math.sin(lon1 - lon2) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2));
            if (angle < 0) {
                angle += Math.PI * 2.0;
            }
            angle = angle * degreesPerRadian;//角度
            return angle;
        }
    
        function PolygonPrimitive(positions: Cesium.CallbackProperty) {
            polygon = viewer.entities.add({
                polygon: {
                    hierarchy: positions,
                    material: Cesium.Color.GREEN.withAlpha(0.1),
                }
            });
    
        }
    
        function distance(point1: Cesium.Cartesian3, point2: Cesium.Cartesian3) {
            var point1cartographic = Cesium.Cartographic.fromCartesian(point1);
            var point2cartographic = Cesium.Cartographic.fromCartesian(point2);
            /**根据经纬度计算出距离**/
            var geodesic = new Cesium.EllipsoidGeodesic();
            geodesic.setEndPoints(point1cartographic, point2cartographic);
            var s = geodesic.surfaceDistance;
            //返回两点之间的距离
            s = Math.sqrt(Math.pow(s, 2) + Math.pow(point2cartographic.height - point1cartographic.height, 2));
            return s;
        }
    }
}
export {
    cesiumUtils
}