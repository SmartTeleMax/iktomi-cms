(function(){
  var currentUrl = window.location.pathname + window.location.search;
  window.addEvent('domready', function(){
    Blocks.init(document.body);

    window.addEvents({'scroll': delegateWindowEvents('scroll'),
                      'mousewheel': delegateWindowEvents('mousewheel'),
                      'resize': delegateWindowEvents('resize')})

    window.addEvent = function(type, callback){
      var delegate = this.document.getElement('.window-delegate');
      delegate.addEvent('delegated-'+type, callback);
    }
    window.removeEvent = function(type, callback){
      var delegate = this.document.getElement('.window-delegate');
      delegate.removeEvent('delegated-'+type, callback);
    };

    // XXX not implemented
    window.addEvents = null;
    window.removeEvents = null;

    document.querySelector('body').addEventListener('click', function(e){
      var link = (e.target.tagName == 'A' && e.target.getAttribute('href')?
                      e.target: 
                      e.target.getParent('a[href]'));
      if (link){
        if (link.get('target') == '_blank' || link.get('rel') == 'external'){
          e.preventDefault();
          window.open(link.href);
          return;
        }
        // XXX cleanup
        var url = link.getAttribute('href');
        if (url.indexOf('://') != -1 || url.indexOf('javascript:') == 0){
          return;
        }
        e.preventDefault();

        if (link.get('rel') == 'popup'){
          var popup = new Popup();
          loadPage(url, false, popup.contentEl);
          popup.contentEl.addEvent('load', function(){
            popup.show();
          });
          return;
        }

        var item_forms = Array.from($$('.item-form'));
        function doLoad() {
          if (item_forms.length){
            var item_form = item_forms.shift();
            item_form.retrieve('ItemForm').autoSaveHandler(doLoad);
          } else {
            loadPage(url);
          }
        }
        doLoad();
      }
    }, false);

    loadPage(null, true);
  });

  function loadPage(url, force, contentBlock){
    contentBlock = contentBlock || $('app-content');
    var isMain = contentBlock == $('app-content');
    if (!url){
      url = window.location.pathname + window.location.search;
    }
    if (isMain && !force && url == currentUrl){
      console.log('Skipping URL (already loaded): ' + url);
      return;
    }
    console.log('loadPage', url);

    document.body.addClass('loading');
    new Request({
      // add __ajax to avoid caching with browser
      'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
      'onSuccess': function(result){
        if (isMain) {
          currentUrl = url;
          var _url = window.location.pathname + window.location.search;
          if (_url != url) {
            history.pushState(null, null, url);
          }
        }
        console.log('loadPage success', url);
        renderPage(result, contentBlock);
      }
    }).get();
  }

  window.addEventListener('popstate', function(e){
    console.log('navigated to: ' + window.location);
    loadPage();
  }, false);

  function renderPage(result, contentBlock){
    try {
      if (typeof result == 'string') {
        result = JSON.decode(result);
      }
    } catch (e){
      contentBlock = contentBlock || $('app-content');
      contentBlock.setStyle('height', contentBlock.getHeight());
      contentBlock.set('html', result);
      if (contentBlock == $('app-content')){
        // delegate which is used to pass events from window to listener
        new Element('div', {'class': 'window-delegate'}).inject(contentBlock);
      }
      Blocks.init(contentBlock);
      window.setTimeout(function(){
        contentBlock.setStyle('height', '');
        if (contentBlock.id == 'app-content'){
          window.scrollTo(window.scrollX, 0);
        }
      }, 2);

      var bodyClass = contentBlock.getElement('[data-body-class]');
      document.body.set('class',
          bodyClass ? bodyClass.dataset.bodyClass : null);
      //document.body.removeClass('loading');

      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("load", false, true);
      contentBlock.dispatchEvent(evt);
      return;
    }


    if (result.location){
      loadPage(result.location, true, contentBlock);
    } else {
      document.body.removeClass('loading');

    }
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
  //
  //Element.prototype.store = function(k, v){
  //  this._storage = this._storage || {};
  //  this._storage[k] = v;
  //  return this;
  //}
  //Element.prototype.retrieve = function(k){
  //  return (this._storage || {})[k];
  //}
  //Element.prototype.eliminate = function(k){
  //  if(this._storage) { delete this._storage[k] }
  //  return this;    
  //}
  //Element.prototype.addEvent = function(ev, callback){
  //  //console.warn('DEPRECATED: addEvent');
  //  this.addEventListener(ev, callback, false);
  //  return this;
  //}
  //Element.prototype.removeEvent = function(ev, callback){
  //  //console.warn('DEPRECATED: removeEvent');
  //  this.removeEventListener(ev, callback);
  //  return this;
  //}

  function delegateWindowEvents(type){
    // Delegate window events to special element which is utilized every time
    // when #app-content is reloaded.
    // This allows us not to pollute window with outdated event handlers and
    // clean up them automatically.
    return function(e){
      var delegate = this.document.getElement('.window-delegate');
      if (delegate) {
        delegate.fireEvent('delegated-'+type, e);
      }
    }
  }

  window.flashRequestError = function(status){
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
    return text
  }
  var tempFailure = Request.prototype.onFailure;
  Request.prototype.onFailure = function(){
    flashRequestError(this.status);
    tempFailure.apply(this, arguments);
    document.body.removeClass('loading');
  }
  window.onerror = function(e){
    flash('Ошибка выполнения клиентской программы:\n'+e, 'failure', 10*1000);
  }

  window.scrollAfterSort = function(tr, offset1){
    var offset2 = tr.offsetTop;
    var scrollParent = tr.parentNode;
    while (scrollParent){
      if (scrollParent == tr.ownerDocument){
        return;
      }
      // XXX scrollParent detection is not fine
      if(scrollParent.scrollTop){
        break;
      }
      var overflow = window.getCompiledStyle(scrollParent, 'overflow-y');
      if(scrollParent.scrollHeight < scrollParent.offsetHeight &&
         (overflow == 'auto' || overflow == 'scroll')){
           break;
      }
      scrollParent = scrollParent.parentNode;
    }
    scrollParent.scrollTop += offset2 - offset1;
  }

  // clean up localStorage
  lscache.flush(true);

})();
