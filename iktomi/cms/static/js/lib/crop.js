(function(){
  
  function Cropper(options){
    this.init(options);
  }

  Cropper.prototype = {
    init: function(options){
      this.targetWidth = options.targetWidth;
      this.targetHeight = options.targetHeight;
      this.targetRatio = this.targetWidth / this.targetHeight;
      this.onCrop = options.onCrop;
      this.onAjaxCrop = options.onAjaxCrop;
      this.cropUrl = options.cropUrl;
      this.postData = options.postData;
      this.cropDataField = options.cropDataField;  
      //this.saveRatio = options.saveRatio != undefined? this.options.saveRatio: true;

      this.popup = new Popup();
      this.popup.onHide = this.onHide.bind(this);
      this.popup.setTitle(options.title || 'Обрезка изображения');
      this.scale = 1;

      this.popup.onWindowResize = function(){
        var width = window.getWidth() - 80; // XXX hardcoded
        var height = window.getHeight() - 190;
        this.scale = Math.min(height / this.sourceHeight,
                              width / this.sourceWidth,
                              1);
        this.setDimensions();
        Popup.prototype.onWindowResize.call(this.popup);
      }.bind(this);
      this.popup._onWindowResize = this.popup.onWindowResize;

      this.resize = false;
      this.container = new Element('div', {'class': 'cropper'});
      this.image = new Element('img', {'class': 'source-image'}).inject(this.container);
      this.area = new Element('div', {'class': 'selected-area'}).inject(this.container);
      this.areaImage = new Element('img', {'src': options.src}).inject(this.area);
      this.image.addEvent('load', function(){
        this.left = this.top = 0;
        this.height = this.maxHeight = this.sourceHeight = this.image.height;
        this.width = this.maxWidth = this.sourceWidth = this.image.width;
        this.sourceRatio = this.sourceWidth / this.sourceHeight;

        if (this.sourceRatio > this.targetRatio){ //XXX
            this.width = this.maxWidth = this.height * this.targetRatio;
            this.left = Math.round((this.sourceWidth - this.width)/2);
        } else if (this.sourceRatio < this.targetRatio) {
            this.height = this.maxHeight = this.width / this.targetRatio;
            this.top = Math.round((this.sourceHeight - this.height)/2);
        }

        this.setDimensions();
        this.container.addEvents({'mousedown': this.startResize.bind(this),
                                  'mousemove': this.doResize.bind(this),
                                  'mouseup': this.stopResize.bind(this),
                                  'mouseleave': this.stopResize.bind(this)});
        this.popup.show();
      }.bind(this));
      this.image.set('src', options.src);

      this.topArea = new Element('div', {'class': 'top-area'}).inject(this.area);
      this.bottomArea = new Element('div', {'class': 'bottom-area'}).inject(this.area);
      this.rightArea = new Element('div', {'class': 'right-area'}).inject(this.area);
      this.leftArea = new Element('div', {'class': 'left-area'}).inject(this.area);

      this.topLeftArea = new Element('div', {'class': 'top-left-area'}).inject(this.area);
      this.topRightArea = new Element('div', {'class': 'top-right-area'}).inject(this.area);
      this.bottomLeftArea = new Element('div', {'class': 'bottom-left-area'}).inject(this.area);
      this.bottomRightArea = new Element('div', {'class': 'bottom-right-area'}).inject(this.area);

      this.popup.contentEl.adopt(this.container);

      this.cropButton = new Element('a', {'class': 'button icon-crop compact-button'})
                                .addEvent('click', this.crop.bind(this))
                                .inject(this.popup.titleEl);
    },

    setDimensions: function(){
      this.image.setStyles({'width': this.sourceWidth * this.scale,
                            'height': this.sourceHeight * this.scale});
      this.areaImage.setStyles({'width': this.sourceWidth * this.scale,
                            'height': this.sourceHeight * this.scale});
      this.area.setStyles({'top': this.top * this.scale,
                           'left': this.left * this.scale,
                           'height': this.height * this.scale,
                           'width': this.width * this.scale});
      this.areaImage.setStyles({'top': -this.top * this.scale,
                                'left': -this.left * this.scale});
    },

    crop: function(){


      if (this.cropUrl) {
        // serverside crop
        var postData = Object.merge({
          left: this.left,
          top: this.top,
          right: this.width + this.left,
          bottom: this.height + this.top
        }, this.postData);

        new Request({
          url: this.cropUrl,
          onSuccess: this.onAjaxCropComplete.bind(this)
        }).post(postData);

      } else {
        var options = {
          rect: {
              left: this.left,
              top: this.top,
              width: this.width,
              height: this.height
          }
        };
        // js crop
        this.image.setStyles({width: 'auto', height: 'auto'});
        Pixastic.process(this.image, "crop", options, this.onCropComplete.bind(this));
      }
    },
    saveCropData:function(){
        if(this.cropDataField){
            // left, top, right, bottom
            var cropData = [this.left, this.top, this.width + this.left, this.height + this.top];
            this.cropDataField.value=JSON.stringify(cropData);
        }
    },

    onCropComplete: function(canvas) {
      canvas.toBlob(function(data){
        data.name = 'cropped.jpeg';
        this.onCrop(data);
        this.saveCropData();

        canvas.setStyle('opacity', 1);
        this.area.destroy();
        this.cropButton.destroy();
        this.popup.hide();
      }.bind(this), 'image/jpeg');
    },

    onAjaxCropComplete: function(e) {
      this.onAjaxCrop(e);
      this.saveCropData();

      this.area.destroy();
      this.cropButton.destroy();
      this.popup.hide();
    },

    onHide: function(){
      this.popup.destroy();
    },

    startResize: function(e){
      e.preventDefault();
      this.resize = true;
      this._x = this._initX = e.event.clientX;
      this._y = this._initY = e.event.clientY;

      this._initWidth = this.width;
      this._initHeight = this.height;

      switch (e.target){
        case this.areaImage: 
          this._action = 'move'; break
        case this.topArea: 
          this._action = 'resize-top'; break
        case this.bottomArea: 
          this._action = 'resize-bottom'; break
        case this.leftArea: 
          this._action = 'resize-left'; break
        case this.rightArea: 
          this._action = 'resize-right'; break

        case this.topLeftArea: 
          this._action = 'resize-top-left'; break
        case this.topRightArea: 
          this._action = 'resize-top-right'; break
        case this.bottomLeftArea: 
          this._action = 'resize-bottom-left'; break
        case this.bottomRightArea: 
          this._action = 'resize-bottom-right'; break
        default:
          this._action = null;
      }
      this.area.addClass('dragging');
    },
    stopResize: function(e){
      e.preventDefault();
      this.resize = false;
      this.area.removeClass('dragging');

      this.left = Math.round(this.left);
      this.top = Math.round(this.top);
      this.width = Math.round(this.width);
      this.height = Math.round(this.height);
    },
    doResize: function(e){
      e.preventDefault();
      if(this.resize){
        var dx = (e.event.clientX - this._x) / this.scale;
        var dy = (e.event.clientY - this._y) / this.scale;
        var initdx = (e.event.clientX - this._initX) / this.scale;
        var initdy = (e.event.clientY - this._initY) / this.scale;
        var oldHeight = this.height;
        var oldWidth = this.width;

        if (this._action == 'move'){
          this.left += dx;
          this.top += dy;
        }
        if (this._action == 'resize-left'){
          dx = Math.max(-this.left, dx);
          this.width = Math.min(this.maxWidth, Math.max(this.targetWidth, this.width-dx));
          this.height = this.width / this.targetRatio;

          this.left -= this.width-oldWidth;
          this.top -= (this.height-oldHeight) / 2;
        }
        if (this._action == 'resize-top'){
          dy = Math.max(-this.top, dy);
          this.height = Math.min(this.maxHeight, Math.max(this.targetHeight, this.height-dy));
          this.width = this.height * this.targetRatio;

          this.top -= this.height - oldHeight;
          this.left -= (this.width-oldWidth) / 2;
        }
        if (this._action == 'resize-right'){
          dx = Math.min(this.sourceWidth - (this.left+this.width), dx);

          this.width = Math.min(this.maxWidth, Math.max(this.targetWidth, this.width+dx));
          this.height = this.width / this.targetRatio;

          this.top -= (this.height-oldHeight) / 2;
        }
        if (this._action == 'resize-bottom'){
          dy = Math.min(this.sourceHeight - (this.top+this.height), dy);

          this.height = Math.min(this.maxHeight, Math.max(this.targetHeight, this.height+dy));
          this.width = this.height * this.targetRatio;
          this.left -= (this.width-oldWidth) / 2;
        }

        if (this._action == 'resize-top-left'){
          var height = Math.min(this.height + this.top, this._initHeight-initdy);
          height = Math.min(this.maxHeight, Math.max(this.targetHeight, height));
          var width1 = height * this.targetRatio;

          var width2 = Math.min(this.width + this.left, this._initWidth-initdx);
          width2 = Math.min(this.maxWidth, Math.max(this.targetWidth, width2));

          this.width = Math.min(width1, width2);
          this.height = this.width / this.targetRatio;
          this.top -= this.height - oldHeight;
          this.left -= this.width-oldWidth;
        }

        if (this._action == 'resize-top-right'){
          var height = Math.min(this.height + this.top, this._initHeight-initdy);
          height = Math.min(this.maxHeight, Math.max(this.targetHeight, height));
          var width1 = height * this.targetRatio;

          var width2 = Math.min(this.sourceWidth - this.left, this._initWidth+initdx);
          width2 = Math.min(this.maxWidth, Math.max(this.targetWidth, width2));

          this.width = Math.min(width1, width2);
          this.height = this.width / this.targetRatio;
          this.top -= this.height - oldHeight;
        }

        if (this._action == 'resize-bottom-left'){
          var height = Math.min(this.sourceHeight - this.top, this._initHeight+initdy);
          height = Math.min(this.maxHeight, Math.max(this.targetHeight, height));
          var width1 = height * this.targetRatio;

          var width2 = Math.min(this.width + this.left, this._initWidth-initdx);
          width2 = Math.min(this.maxWidth, Math.max(this.targetWidth, width2));

          this.width = Math.min(width1, width2);
          this.height = this.width / this.targetRatio;
          this.left -= this.width-oldWidth;
        }

        if (this._action == 'resize-bottom-right'){
          var height = Math.min(this.sourceHeight - this.top, this._initHeight+initdy);
          height = Math.min(this.maxHeight, Math.max(this.targetHeight, height));
          var width1 = height * this.targetRatio;

          var width2 = Math.min(this.sourceWidth - this.left, this._initWidth+initdx);
          width2 = Math.min(this.maxWidth, Math.max(this.targetWidth, width2));

          this.width = Math.min(width1, width2);
          this.height = this.width / this.targetRatio;
        }

        this.left = Math.min(this.sourceWidth-this.width,
                             Math.max(0, this.left));
        this.top = Math.min(this.sourceHeight-this.height,
                            Math.max(0, this.top));

        this._x = e.event.clientX;
        this._y = e.event.clientY;
        this.setDimensions();
      }
    }
  }

  //Blocks.register('cropper', function(){});

  window.Cropper = Cropper;
})();
