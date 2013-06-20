(function(){
  window.loadedCSS = [];
  var current_url = null;

  window.addEvent('domready', function(){
    var cssLinks = document.querySelectorAll('head link[type="text/css"]');
    for (var i=0; i < cssLinks.length; i++){
      window.loadedCSS.push(cssLinks[i].getAttribute('href'));
    }

    document.querySelector('body').addEventListener('click', function(e){
      var link = (e.target.tagName == 'A' && e.target.getAttribute('href')?
                      e.target: 
                      e.target.getParent('a[href]'));
      if (link){
        // XXX cleanup
        var url = link.getAttribute('href');
        if (url.indexOf('://') != -1 || url.indexOf('javascript:') == 0){
          return;
        }
        loadPage(url);
        e.preventDefault();
      }
    }, false);

    loadPage();
  });

  function loadPage(url, force){
    if (url){
      history.pushState(null, null, url);
    } else {
      url = window.location.pathname + window.location.search;
    }
    if (!force && url == current_url){
      console.log('Skipping URL (already loaded): ' + url);
      return;
    }

    new Request.JSON({
      // add __ajax to avoid caching with browser
      'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
      'onSuccess': function(result){
        current_url = url;
        console.log('loadPage success', url);
        renderPage(result);
      }
    }).get();
  }

  window.addEventListener('popstate', function(e){
    console.log('navigated to: ' + window.location);
    loadPage();
  }, false);

  function renderPage(result, content_block, callback){
    var content = content_block !== undefined ? content_block : $('app-content');
    content.setStyle('height', content.getHeight());

    if (result.location){
        loadPage(result.location, true);
        return;
    }

    if (result.html){
      content.innerHTML = result.html;
    }

    Blocks.init(content);

    window.setTimeout(function(){content.setStyle('height', '');}, 0);
  }

  function generalFormSubmit(form){
    var url = form.getProperty('action');
    new Request.JSON({
      // add __ajax to avoid caching with browser
      'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
      'onSuccess': function(result){
        console.log('form submitted', form);
        if (result.redirect_to){
          loadPage(result.redirect_to);
        } else {
          renderPage(result);
        }
      }
    })[form.method.toLowerCase()](form);
  }

  window.loadPage = loadPage;
  window.renderPage = renderPage;
  window.generalFormSubmit = generalFormSubmit;


  // default implementation generate tons of garbage in memory if element is not removed by
  // Element.destroy()
  // And also this will not work at least in old IEs
  Element.prototype.store = function(k, v){
    this._storage = this._storage || {};
    this._storage[k] = v;
    return this;
  }
  Element.prototype.retrieve = function(k){
    return (this._storage || {})[k];
  }
  Element.prototype.eliminate = function(k){
    if(this._storage) { delete this._storage[k] }
    return this;    
  }
  Element.prototype.addEvent = function(ev, callback){
    //console.warn('DEPRECATED: addEvent');
    this.addEventListener(ev, callback, false);
    return this;
  }
  Element.prototype.removeEvent = function(ev, callback){
    //console.warn('DEPRECATED: removeEvent');
    this.removeEventListener(ev, callback);
    return this;
  }

  var tempFailure = Request.prototype.onFailure;
  Request.prototype.onFailure = function(){
    var status = this.status;
    if (status == 0) {
      var text = 'Ошибка сети';
    } else if (status/100>>0 == 5){
      var text = 'Ошибка сервера ('+status+')';
    } else if (status/100>>0 == 4){
      var text = 'Ошибка приложения ('+status+')';
    } else {
      var text = 'Ошибка ('+status+')';
    }
    flash(text, 'failure', 10*1000)
    tempFailure.apply(this, arguments);
  }
})();