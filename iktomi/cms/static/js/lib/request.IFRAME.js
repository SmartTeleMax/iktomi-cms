Request.IFRAME = new Class({

        Extends: Request,

        createFrame: function(){
            var frm_name = Math.random().toString().replace('0.','iframe_');
            var frame = new Element('iframe', {
                'id':frm_name,
                'name':frm_name,
                'styles':{'visibility':'hidden'}
            }).inject(document.body);
            return frame;
        },

        post: function(form) {
            form.action = this.options.url;
            form.method = 'post';
            form.enctype = 'multipart/form-data';

            var frame = this.createFrame();

            frame.onload = function() {
                try {
                  var loaded_data = this.processScripts(frame.contentDocument.body.innerHTML);
                  this.fireEvent('complete', loaded_data).fireEvent('success', loaded_data).callChain();
                } catch(e) {
                  var w = window.open('','Request.IFRAME error report', 'width='+screen.availWidth/2+', scrollbars=yes, top=0, left='+screen.availWidth/2, false);
                  w.document.body.innerHTML='<h3>'+e.name+': '+e.message+'</h3>'
                      +'<dl><dt>filename</dt><dd> '+e.fileName+'</dd></dl>'
                      +'<dl><dt>linenumber</dt><dd> '+e.lineNumber+'</dd></dl>'
                      +'<dl><dt>stack</dt><dd> '+e.stack+'</dd></dl>';
                }

                setTimeout(function(){
                    frame.destroy()
                }, 100);

            }.bind(this);
            form.target=frame.id;
            form.submit();
            return this;
        },

        get: function(obj){
            var name;
            var querystr = '';

            for (name in obj){
                querystr +=name+'='+obj[name]+'&';
            }
            querystr='?'+querystr.substring(0, (querystr.length-1));
            var frame = this.createFrame();
            frame.src = this.options.url+querystr;
            frame.onload = function() {
            try {
              var loaded_data = this.processScripts(frame.contentDocument.body.innerHTML);
              this.fireEvent('complete', loaded_data).fireEvent('success', loaded_data).callChain();
              } catch(e) {
                var w = window.open('','Request.IFRAME error report',
                                    'width='+screen.availWidth/2+', scrollbars=yes, top=0, left='+
                                             screen.availWidth/2, false);
                w.document.body.innerHTML='<h3>'+e.name+': '+e.message+'</h3>'
                        +'<dl><dt>filename</dt><dd> '+e.fileName+'</dd></dl>'
                        +'<dl><dt>linenumber</dt><dd> '+e.lineNumber+'</dd></dl>'
                        +'<dl><dt>stack</dt><dd> '+e.stack+'</dd></dl>';
              }
              setTimeout(function(){
                frame.destroy();
              }, 100);
            }.bind(this);
            return this;
        }
});
