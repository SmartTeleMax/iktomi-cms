var DragUpload = new Class({
  // fires: over, out, start, addfile, start, progress, complete, error
  
  Implements: [Events, Options],
  Binds: ['disable', 'enable', '_over', '_leave', '_drop'],
  
  options: {
    url: "",
        disabled: false,
        parallel_uploads: 3,
        max_file_count: -1, //infinite by default
        extra_query_string: ''
  },
  
    check_browser: function(){
        return true;
        // works only with Chrome and Gecko 1.9.2 or newer
        var ff = navigator.userAgent.match(/rv\:(\d+)\.(\d+)\.(\d+).+Gecko/);
        if (ff){
            return ff[1] * 10000 + ff[2] * 100 + ff[3] * 1 >= 10902; //XXX ugly
        }
        return navigator.userAgent.search('Chrome') != -1;
    },

  initialize: function(element, options){
        var self = this;
      this.setOptions(options || {});
    this.el = $(element);
        this.queue = new Array();
        this.uploading_count = 0;
        if (! this.check_browser()){return false;}

        //patch Mootools events list
    Element.NativeEvents.dragover = 2;
    Element.NativeEvents.dragenter = 2;
    Element.NativeEvents.dragleave = 2;
    Element.NativeEvents.drop = 2;
    this.el.addEvents({
      "dragover": this._over,
      "dragenter": function(){return false;},
      'dragleave': this._leave,
      "drop": this._drop
    });
    document.addEvents({ //????
        'dragenter': function(e) {return false;},
        'dragleave': function(e) {return false;},
        'dragover': function(e) {
            var dt = e.event.dataTransfer;
            if (!dt) { return false; }
            dt.dropEffect = 'none';
            return false;
        }.bind(this)
    });
  },

    bindfile: function(fileinput){
        var self = this;
        fileinput.addEvent('change', function(e){
            var file = this.files[0];
            if (file.size!==undefined){
              self.fireEvent('addfile', {
                  file: file,
                  fileName: file.fileName || file.name,
                  event: e.event
              });
              self.upload(file);
            }
  });
    },

  _leave: function(e){
    this.fireEvent('out', e);
  },

  _over: function(e){
    var dt = e.event.dataTransfer;
    if(this.options.disabled) return false;
    if(!dt) return false;
     //FF - does not work
    //if(dt.types.contains&&!dt.types.contains("Files")) return false;
    //Chrome - does not work
    //if(dt.types.indexOf&&dt.types.indexOf("Files")==-1) return false;

//    if(Browser.Engine.webkit) dt.dropEffect = 'copy'; // does not fork in new version of Chrome

    this.fireEvent('over', e);

    return false;
  },

  _drop: function(e){
    var dt = e.event.dataTransfer;
    if(!dt&&!dt.files) return false;
    if(this.options.disabled) return false;

    this.fireEvent('out', e);
    
    var files = dt.files;
    for (var i = 0; i < files.length && i!= this.options.max_file_count; i++) {
            var file = files[i];
            if (file.size!==undefined){
                this.fireEvent('addfile', {
                    event: e.event, 
                    fileName: file.fileName || file.name, 
                    file: file
                    });
                this.upload(file);
            }
     }
    return false;
  },

  upload: function(file){
        if (this.uploading_count < this.options.parallel_uploads){
            var fileSize = file.size;// || file.fileSize;

            this.fireEvent('start', file);
            this.uploading_count++;

            var url = this.options.url+"?file="+(file.fileName || file.name) + this.options.extra_query_string;
            url += '&content-length=' + fileSize; //since a bug with Content-Length

            var xhr = new XMLHttpRequest();
            //xhr.setRequestHeader("Content-Length", fileSize);
            file.xhr = xhr;
            var progress = (function(e){
                e.fileName = (file.fileName || file.name);
          this.fireEvent('progress', e);
        }).bind(this);
  
        xhr.upload.addEventListener('progress', progress, false);
        //xhr.addEventListener('progress', progress, false);
    
        xhr.onload = function(e){
                e.fileName = file.fileName || file.name;
                this.uploading_count--;
                var queue_file = this.queue.shift();
                if (queue_file){
                    this.upload(queue_file);
                }
          this.fireEvent('complete', e);
        }.bind(this);

            xhr.onabort = function(e){
            this.fireEvent('abort', e);
            }.bind(this);
            
            xhr.onerror = function(e){
            this.fireEvent('error', e);
            }.bind(this);
            
            xhr.open('POST', url, true);
          xhr.send(file);
        } else {
            this.queue.push(file);
        }
  },

    cancel: function(file){
        if (file.xhr){
            file.xhr.abort();
            file.xhr.onreadystatechange = $empty;
            this.uploading_count--; // XXX
        } else if (this.queue.contains(file)){
            // XXX: not debugged
            this.queue.remove(file);
        }
        this.fireEvent('cancel', file);
    },

    enable: function(){
        this.options.disabled = false;
    },
    disable: function(){
        this.options.disabled = true;
    }
});


var FileManagerSingle = new Class({
  Implements: [Events, Options],
  Binds: ['onDrop', 'onProgress', 'onLoad', 'onError', 'onAbort'],
  
  options: {
    url: "",
        input_name: 'file',
        image: false,
        thumb_size: null,
        canvas_thumb_preview: false
  },

  initialize: function(element, options){
      this.setOptions(options || {});
    this.el = element = $(element);
        this.uploading_file = null;
        this.file_data = element.getElement('.file_data');
        var qs = '';
        if (this.options.image){
            qs += '&image=1';
            this.thumb = this.el.getElement('.thumbnail');
        }
        if (this.options.thumb_size){
            qs += '&thumb_width='+this.options.thumb_size[0]+
                  '&thumb_height='+this.options.thumb_size[1];
        }
    this.uploader = new DragUpload(this.el, {
            url: this.options.url,
            max_file_count: 1,
            extra_query_string: qs
        }).addEvents({
      addfile: this.onDrop,
            progress: this.onProgress,
      complete: this.onLoad,
            error: this.onError,
            abort: this.onAbort,
            over: function(){ element.addClass('hover'); },
            out: function(){ element.removeClass('hover'); }
    });
        //if (this.uploader.check_browser()){
    this.fileinput = element.getElement('input[type="file"]');
    this.uploader.bindfile(this.fileinput);

    this.el.addClass('active');
    this.pb_container = new Element('div').setStyle('display', 'none')
                .inject(element);
    this.progressbar = new ProgressBar({
      container: this.pb_container, 
      displayText: true
    });
    this.cancelButton = new Element('a', {'href': '#', 'text': 'отмена'})
              .addEvent('click', function(e){
                e.stop();
                this.cancel();
              }.bind(this))
              .inject(this.pb_container);

    this.clrbtn = new Element('a', {
        'href': "#clear", 
        'text': '(очистить поле)'
    }).addEvent('click', function(e){
        e.stop();
        this._replace_fileinput();
    }.bind(this)).setStyles({'margin-left': '5px', 'display': 'none'}).inject(this.fileinput, 'after');
    //}
  },

  onDrop: function(e){
        if (this.uploading_file){
            this.uploader.cancel(this.uploading_file);
        }
        this.uploading_file = e.file;
    this.file_data.adopt(new Element('p').set('text', 'Загрузка файла: ' + e.fileName));
        this.progressbar.set(0);
//        this.uploader.disable();
        this.pb_container.setStyle('display', '');

        // Render a thumbnail if the file is an image
        if (this.fileReaderSupport && this.thumb && this.options.canvas_thumb_preview){
            this.thumb.set('src', '#').setStyle('display', 'none');
            //delete this.reader; //XXX?
            this.reader = new FileReader();

            // Closure to capture the file information.
            this.reader.onload = (function(e) {
                thumb_size = this.options.thumb_size || (600, 600);
                var temp_img = new Element('img').setStyles({
                    'max-width': Math.min(600, thumb_size[0]),
                    'max-height': Math.min(600, thumb_size[1]),
                    'visibility': 'hidden',
                    'position': 'fixed'
                }).inject(document.body);
                temp_img.addEvent('load', function(){
                    var cnv = new Element('canvas', {'width': temp_img.width,
                                                     'height': temp_img.height})
                                         .inject(this.thumb, 'after');
                    var scale = Math.min(temp_img.height / temp_img.naturalHeight,
                                         temp_img.width / temp_img.naturalWidth)
                    var ctx = cnv.getContext('2d');
                    ctx.scale(scale, scale);
                    ctx.drawImage(temp_img, 0, 0);
                    temp_img.destroy();
                    this.thumb.destroy();
                    this.thumb = cnv;
                }.bind(this)).set('src', e.target.result);
            }).bind(this);
            // Read in the image file as a data URL.
            this.reader.readAsDataURL(this.uploading_file);
        } // Temporary disabled
  },

  onProgress: function(e){
        this.progressbar.set(e.loaded/e.total * 100)
  },

  onLoad: function(e){
        data = JSON.decode(e.target.responseText);
        if (data.status != 'ok' || !data.file){
            var error = data.status != 'ok'? data.error : "ответ сервера не содержит имени файла"; 
            alert("Ошибка: " + error)
            return this.cancel(error);
        }

        //this.uploader.enable();
        this.uploading_file = null;
        this._replace_fileinput();
        this.clrbtn.setStyle('display', 'none');

        this.progressbar.set(100);
        (function(){
            this.pb_container.setStyle('display', 'none');
        }.bind(this)).delay(2000);

        this.file_data.empty().adopt(
            new Element('p').set('html', 'загружен временный файл: <br/>').adopt(
                new Element('a', {href: data.file_url, text: data.file})
        ));
        if (data.thumbnail && this.thumb && this.thumb.nodeName == 'IMG'){
            this.thumb.setStyle('display', '').set('src', data.thumbnail);
        }

        add_hidden = function(name, value){
            // shortcut for hidden inputs
            return new Element('input', {
                'type': 'hidden', 
                'name': this.options.input_name + '.' + name, 
                'value': value
            }).inject(this.file_data);
        }.bind(this);
        add_hidden('mode', 'temp');
        add_hidden('temp_name', data.file);
        add_hidden('original_name', e.fileName);
  },

    cancel: function(reason){
        // cancels current upload
        if (this.uploading_file){
            this.uploader.cancel(this.uploading_file);
        this.uploading_file = null;
            this.canceled = true;
        }
        this.pb_container.setStyle('display', 'none');
        var text = 'Отмена загрузки';
        if(reason){
            text += ': ' + reason;
        }
    this.file_data.adopt(new Element('p').set('text', text));
        if (this.thumb){
            this.thumb.set('src', '#').setStyle('display', 'none');
        }
    },

    _replace_fileinput: function(){
        // helper function. Disposes old file input, creates and binds a new one
        var oldfi = this.fileinput;
        this.fileinput = new Element('input', {
            type: 'file',
            name: oldfi.name
        }).inject(oldfi, 'after');
        this.uploader.bindfile(this.fileinput);
        oldfi.dispose();
    },

    onError: function(e){
        var stat;
        if (typeof e == 'string'){
          stat = e;
        } else {
          try{// XXX is try-catch necessary here?
              stat = e.target.status;
          } catch (e) {
              stat = 'код ошибки неизвестен';
          }
          alert('Ошибка на сервере или в сети: ' + stat);
        }
        this.cancel('ошибка (' + stat + ')')
        this.clrbtn.setStyle('display', '');
    },

    onAbort: function(e){
        if (!this.canceled){
        this.file_data.adopt(new Element('p').set('text', 'Загрузка файла прервана'));
        }
        this.pb_container.setStyle('display', 'none');
        this.canceled = false;
        this.clrbtn.setStyle('display', '');
    },

    // Temporary disabled. Image resize method needed
    fileReaderSupport: typeof FileReader != 'undefined'
});
