(function(){
  var progressSupport = ('onprogress' in new Browser.Request);

  Request.Multipart = new Class({
    
    Extends: Request,
    /* slightly modificated original 'Request.send'*/
    /* post must recieve form element to create FormData */
    send: function(formElement){
      var options = {};
      if(typeOf(formElement) == 'element'){
        var data = new FormData(formElement);
        options = {data: data};
      }
      this.options.isSuccess = this.options.isSuccess || this.isSuccess;
      this.running = true;

      var old = this.options;
      options = Object.append({data: old.data, url: old.url}, options);
      var url = String(options.url);

      if (!url) url = document.location.pathname;

      var trimPosition = url.lastIndexOf('/');
      if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) url = url.substr(0, trimPosition);

      if (this.options.noCache)
          url += (url.indexOf('?') > -1 ? '&' : '?') + String.uniqueID();

      var xhr = this.xhr;
      if (progressSupport){
          xhr.onloadstart = this.loadstart.bind(this);
          xhr.upload.onprogress = this.progress.bind(this);
      }

      xhr.open('POST', url, this.options.async, this.options.user, this.options.password);
      if ((/*<1.4compat>*/this.options.user || /*</1.4compat>*/this.options.withCredentials) && 'withCredentials' in xhr) xhr.withCredentials = true;

      xhr.onreadystatechange = this.onStateChange.bind(this);

      Object.each(this.headers, function(value, key){
          try {
              xhr.setRequestHeader(key, value);
          } catch (e){
              this.fireEvent('exception', [key, value]);
          }
      }, this);

      this.fireEvent('request');
      xhr.send(options.data);
      if (!this.options.async) this.onStateChange();
      else if (this.options.timeout) this.timer = this.timeout.delay(this.options.timeout, this);
      return this;
    },

    setOptions: function(){
        var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
        if (this.addEvent) for (var option in options){
            if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
            this.addEvent(option, options[option]);
            delete options[option];
        }
        /* allowing FormData objects to be arguments */
        if(arguments[0].data){
            this.options.data = arguments[0].data;    
        }
        return this;
    }
  });

})();
