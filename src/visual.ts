/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    export class SimpleHeatMap {
        /*
         (c) 2014, Vladimir Agafonkin
         simpleheat, a tiny JavaScript library for drawing heatmaps with Canvas
         https://github.com/mourner/simpleheat
        Copyright (c) 2014, Vladimir Agafonkin
        All rights reserved.
        Redistribution and use in source and binary forms, with or without modification, are
        permitted provided that the following conditions are met:
           1. Redistributions of source code must retain the above copyright notice, this list of
              conditions and the following disclaimer.
           2. Redistributions in binary form must reproduce the above copyright notice, this list
              of conditions and the following disclaimer in the documentation and/or other materials
              provided with the distribution.
        THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
        EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
        MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
        COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
        EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
        SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
        HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
        TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
        SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */
        private ctx: any;
        private canvas: HTMLCanvasElement;
        private circle: HTMLCanvasElement;
        private width: number;
        private height: number;
        private maxValue: number;
        private dataPoints: any;
        private r: number;
        private grad: Uint8ClampedArray;
        private useAutoDetectIntensity: boolean;
        private usePercentageScaling: boolean;

        public defaultRadius = 5;
        public defaultGradient = {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        };

        constructor(canvas) {
            // jshint newcap: false, validthis: true
            //if (!(this instanceof SimpleHeatMap)) { return new SimpleHeatMap(canvas); }

            this.canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

            this.ctx = canvas.getContext('2d');
            this.width = canvas.width;
            this.height = canvas.height;

            this.maxValue = 1;
            this.dataPoints = [];
        }

        public data(data) {
            this.dataPoints = data;
            return this;
        }

        public max(max) {
            this.maxValue = max;
            return this;
        }

        public autoIntensity(auto)
        {
            this.useAutoDetectIntensity = auto;
            return this;
        }

        public percentageScaling(use)
        {
            this.usePercentageScaling = use;
            return this;
        }

        public add(point) {
            this.dataPoints.push(point);
            return this;
        }

        public clear() {
            this.dataPoints = [];
            return this;
        }

        public radius(r: number, blur?: number) {
            blur = blur === undefined ? 15 : blur;

            // create a grayscale blurred circle image that we'll use for drawing points
            var circle = this.circle = document.createElement('canvas'),
                ctx = circle.getContext('2d'),
                r2 = this.r = r + blur;

            circle.width = circle.height = r2 * 2;

            ctx.shadowOffsetX = ctx.shadowOffsetY = 200;
            ctx.shadowBlur = blur;
            ctx.shadowColor = 'black';

            ctx.beginPath();
            ctx.arc(r2 - 200, r2 - 200, r, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();

            return this;
        }

        public gradient(grad) {
            // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d'),
                gradient = ctx.createLinearGradient(0, 0, 0, 256);

            canvas.width = 1;
            canvas.height = 256;

            for (let i in grad) {
                gradient.addColorStop(parseFloat(i), grad[i]);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 256);

            this.grad = ctx.getImageData(0, 0, 1, 256).data;

            return this;
        }

        public draw(minOpacity?: number) {
            if (!this.circle) {
                this.radius(this.defaultRadius);
            }
            if (!this.grad) {
                this.gradient(this.defaultGradient);
            }

            var ctx = this.ctx;

            ctx.clearRect(0, 0, this.width, this.height);
            if (this.useAutoDetectIntensity)
            {
                console.log('using auto detect intensity');
                var tmpMax = 0;
                for(var i=0, len=this.dataPoints.length;i<len;i++)
                {                 
                    if (this.dataPoints[i][2]>tmpMax )
                    {                        
                        tmpMax = this.dataPoints[i][2];
                    }
                }
                this.maxValue = tmpMax;
            }
            console.log('maxvalue: ' + this.maxValue);
            console.log('use Percentage scaling' + this.usePercentageScaling);
            // draw a grayscale heatmap by putting a blurred circle at each data point
            for (var i = 0, len = this.dataPoints.length, p; i < len; i++) {
                p = this.dataPoints[i];

                //"Syphontwo" Proposed Change
				//make it so the X and Y input values are a percentage
				//this means that the data collected is from 0 to 1 along each axis
				//multiply it by the current canvas size
                //this should keep the data scalable with the images and resizing
                if (this.usePercentageScaling)
                {
				    p[0] = p[0] * this.width;
                    p[1] = p[1] * this.height;
                }
				//end proposed change
                
                ctx.globalAlpha = Math.max(p[2] / this.maxValue, minOpacity === undefined ? 0.05 : minOpacity);
                ctx.drawImage(this.circle, p[0] - this.r, p[1] - this.r);
            }

            // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
            var colored = ctx.getImageData(0, 0, this.width, this.height);
            this._colorize(colored.data, this.grad);
            ctx.putImageData(colored, 0, 0);

            return this;
        }
        private _colorize(pixels, gradient) {
            for (var i = 3, len = pixels.length, j; i < len; i += 4) {
                j = pixels[i] * 4; // get gradient color from opacity value

                if (j) {
                    pixels[i - 3] = gradient[j];
                    pixels[i - 2] = gradient[j + 1];
                    pixels[i - 1] = gradient[j + 2];
                }
            }
        }
    }

    export interface HeatMapData {
        x: PrimitiveValue;
        y: PrimitiveValue;
        i: PrimitiveValue;
    }

    export interface HeatMapDataModel {
        dataArray: HeatMapData[];
    };

    export class Visual implements IVisual {

        public currentViewport: IViewport;

        private element: HTMLElement;
        private heatMap: SimpleHeatMap;
        private dataView: DataView;
        private backgroundUrl: string;
        private defaultBackgroundUrl = "";
        private canvasWidth: number = 680;
        private canvasHeight: number = 480;
        private maxValue = 1;

        // Convert a DataView into a view model
        public static converter(dataView: DataView): HeatMapDataModel {
            console.log('converter', dataView);            
            var dataPoints: HeatMapData[] = [];
            var xCol, yCol, iCol;
            xCol = yCol = iCol = -1;
            var index = 0;
            var catDv: DataViewCategorical = dataView.categorical;
            var values = catDv.values;
            if (typeof (dataView.metadata.columns[0].roles) !== 'undefined') {
                for (var i = 0; i < catDv.values.length; i++) {
                    var colRole = values[i].source.roles;
                    if (colRole["X"]) {
                        xCol = index;
                    }
                    if (colRole["Y"]) {
                        yCol = index;
                    }

                    if (colRole["Intensity"]) {
                        iCol = index;
                    }
                    if (colRole["Category"]) {
                        continue;
                    }
                    index++;
                }
            } else {
                //For sandbox mode
                console.log('in sandbox mode');
                xCol = 0;
                yCol = 1;
                iCol = 2;
                if (typeof (values[xCol]) === 'undefined' ||
                    typeof (values[yCol]) === 'undefined' ||
                    (iCol !== -1 && typeof (values[iCol]) === 'undefined')) {
                    return {
                        dataArray: dataPoints
                    };
                }
            }

            if (xCol !== -1 && yCol !== -1) {
                for (var k = 0, kLen = values[0].values.length; k < kLen; k++) {

                    dataPoints.push({
                        x: values[xCol].values[k],
                        y: values[yCol].values[k],
                        i: iCol !== -1 ? values[iCol].values[k] : 1
                    });
                }
            }
            //console.log('data', dataPoints);
            return {
                dataArray: dataPoints
            };
        }

        constructor(options: VisualConstructorOptions) {
            this.intialize(options.element);
            this.heatMap = new SimpleHeatMap(this.element);
        }

        /* Called for data, size, formatting changes*/
        public update(options: VisualUpdateOptions) {

            this.dataView = options.dataViews[0];
            this.currentViewport = options.viewport;
            this.updateBackgroundUrl();
            this.redrawCanvas();

        }

        public redrawCanvas() {
            //this.updateCanvasSize();
            this.updateInternal(false);
            this.heatMap.max(Visual.getFieldNumber(this.dataView, 'settings', 'maxValue', this.maxValue));
            this.heatMap.autoIntensity(Visual.getFieldBoolean(this.dataView, 'settings', 'autoIntensity', false));
            this.heatMap.percentageScaling(Visual.getFieldBoolean(this.dataView, 'settings', 'pctscale', false));
            this.heatMap.radius(Visual.getFieldNumber(this.dataView, 'settings', 'radius', 5), Visual.getFieldNumber(this.dataView, 'settings', 'blur', 5));
            var data = Visual.converter(this.dataView);
            this.heatMap.clear();
            this.heatMap.data(data.dataArray.map(s => {
                return [s.x, s.y, s.i];
            }));
            this.heatMap.draw();
        }

        /*About to remove your visual, do clean up here */
        public destroy() {

        }

        /* Called when the view port resizes */
        public onResizing(viewport: IViewport): void {
            if (this.currentViewport.width !== viewport.width || this.currentViewport.height !== viewport.height) {
                this.currentViewport = viewport;
                this.updateInternal(false /* dataChanged */);
            }
        }



        //Make visual properties available in the property pane in Power BI
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            var instances: VisualObjectInstance[] = [];
            var dataView = this.dataView;

            switch (options.objectName) {
                case 'settings':
                    var general: VisualObjectInstance = {
                        objectName: 'settings',
                        displayName: 'General',
                        selector: null,
                        properties: {
                            backgroundUrl: Visual.getFieldText(dataView, 'settings', 'backgroundUrl', this.backgroundUrl),
                            radius: Visual.getFieldNumber(dataView, 'settings', 'radius', 5),
                            blur: Visual.getFieldNumber(dataView, 'settings', 'blur', 15),
                            //                            maxWidth: HeatMapChart.getFieldNumber(dataView, 'settings', 'maxWidth', this.canvasWidth),
                            //                            maxHeight: HeatMapChart.getFieldNumber(dataView, 'settings', 'maxHeight', this.canvasHeight),
                            autoIntensity: Visual.getFieldBoolean(dataView, 'settings','autoIntensity', false),
                            pctscale: Visual.getFieldBoolean(dataView, 'settings','pctscale', false),
                            maxValue: Visual.getFieldNumber(dataView, 'settings', 'maxValue', 1)
                        }
                    };
                    instances.push(general);
                    break;
            }

            return instances;
        }

        public canResizeTo(viewport: IViewport): boolean {
            return true;
        }

        private getViewPort(): IViewport {
            var currentViewport = this.currentViewport;
            var mapViewport = {
                width: currentViewport.width,
                height: currentViewport.height
            };

            return mapViewport;
        }

        private intialize(container: HTMLElement): void {
            var canvas = document.createElement('canvas');
            canvas.className = "myClass";
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;

            container.appendChild(canvas);

            this.element = canvas;
            this.updateBackgroundUrl();
            this.writeHelpOnCanvas();
        }

        private writeHelpOnCanvas(): void {
            var canvas = <HTMLCanvasElement>this.element;
            var context = canvas.getContext("2d");
            context.font = 'bold 10pt Calibri';
            function wrapText(context, text, x, y, maxWidth, lineHeight) {
                var words = text.split(' ');
                var line = '';

                for (var n = 0; n < words.length; n++) {
                    var testLine = line + words[n] + ' ';
                    var metrics = context.measureText(testLine);
                    var testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        context.fillText(line, x, y);
                        line = words[n] + ' ';
                        y += lineHeight;
                    }
                    else {
                        line = testLine;
                    }
                }
                context.fillText(line, x, y);
            }
            var border = 60;
            var maxWidth = this.canvasWidth - border;
            var lineHeight = 20;
            var x = (this.canvasWidth - maxWidth) / 2;
            var y = border;
            wrapText(context, 'Select a background image, the width and height of the image should match the maximum x,y data points in the dataset. Alternatively you can enable percentage scale, then you x, y coordinate should be between 0 and 1 and the visual will scale their position to the size of the image', x, y, maxWidth, lineHeight);
        }

        private updateBackgroundUrl() {
            var newBackgroundUrl = Visual.getFieldText(this.dataView, 'settings', 'backgroundUrl', this.defaultBackgroundUrl);
            if (this.backgroundUrl !== newBackgroundUrl) {
                var style = this.element.style;

                style.background = 'url("' + newBackgroundUrl + '")';
                style['background-size'] = '100% 100%';
                this.backgroundUrl = newBackgroundUrl;
                var img = new Image();
                var self = this;
                img.onload = function () {
                    self.updateCanvasSize((<HTMLImageElement>this).width, (<HTMLImageElement>this).height);
                    //HeatMapChart.setFieldNumber(self.dataView, 'settings', 'maxWidth', this.width);
                    //HeatMapChart.setFieldNumber(self.dataView, 'settings', 'maxHeight', this.height);
                    self.redrawCanvas();
                };
                img.src = newBackgroundUrl;
            }
        }

        private updateCanvasSize(newWidth: number, newHeight: number) {
            var updated = false;
            //var newWidth = HeatMapChart.getFieldNumber(this.dataView, 'settings', 'maxWidth', this.canvasWidth);
            if (this.canvasWidth !== newWidth) {
                this.canvasWidth = newWidth;
                (<HTMLCanvasElement>this.element).width = newWidth;
                updated = true;
            }

            //var newHeight = HeatMapChart.getFieldNumber(this.dataView, 'settings', 'maxHeight', this.canvasHeight);
            if (this.canvasHeight !== newHeight) {
                this.canvasHeight = newHeight;
                (<HTMLCanvasElement>this.element).height = newHeight;
                updated = true;
            }
            if (updated) {
                this.heatMap = new SimpleHeatMap(this.element);
            }
        }

        private updateInternal(redraw: boolean): void {
            var mapViewport = this.getViewPort();
            var style = this.element.style;
            style.height = mapViewport.height + 'px';
            style.width = mapViewport.width + 'px';
        }

        private static getFieldText(dataView: DataView, field: string, property: string = 'text', defaultValue: string = ''): string {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var f = objects[field];
                    if (f) {
                        var text = <string>f[property];
                        if (text)
                            return text;
                    }
                }
            }
            return defaultValue;
        }

        private static getFieldNumber(dataView: DataView, field: string, property: string = 'text', defaultValue: number = 100): number {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var f = objects[field];
                    if (f) {
                        var num = <number>f[property];
                        if (num)
                            return num;
                    }
                }
            }
            return defaultValue;
        }

        private static getFieldBoolean(dataView: DataView, field: string, property: string = 'text', defaultValue: boolean = false): boolean {
            if (dataView) {
                var objects = dataView.metadata.objects;
                if (objects) {
                    var f = objects[field];
                    if (f) {
                        var num = <boolean>f[property];
                        if (num)
                            return num;
                    }
                }
            }
            return defaultValue;
        }
    }
}
