(function(){
  function ItemForm(frm){
    //console.log('Generating ItemForm #'+frm.id);

    this.frm = frm;
    this._callback_hook = undefined;
    frm.store('ItemForm', this);
    frm.store('savedData', this.formHash());
    this.container = frm.getParent('.popup-body') || $('app-content');
    this.is_popup = !!frm.getParent('.popup-body');
    this.popup = frm.getParent('.popup');
    this.statusElement = this.frm.getElement('.autosave-status') || new Element('div');

    this.bindEventHandlers();
    this.addEvents();
    this.attachHooks();
    window.scrollTo(window.scrollX, window.scrollY+1);
  }

  ItemForm.prototype = {
    saveInProgress: function(){
        return this.saveRequest && this.saveRequest.running;    
    },

    attachHooks: function(){
      var hooks = new PreSaveHooks(this.frm);
      hooks.addEvent('ready', function(){
        this.doSubmit.delay(0);
      }.bind(this));
      this.frm.store('hooks', hooks);

      if (this.frm.dataset.presavehooks){
        var hooks_list = this.frm.dataset.presavehooks.split(' ');
        for (var i=0; i<hooks_list.length; i++){
          hooks.append(window[hooks_list[i]]);
        }
      }

      if (this.frm.dataset.autosave){
        this.autoSaveInterval = window.setInterval(this.autoSaveHandler, 5000);
      }
    },

    bindEventHandlers: function(){
      this.redirectHandler = this.redirectHandler.bind(this);
      this.postHandler = this.postHandler.bind(this);
      this.saveHandler = this.saveHandler.bind(this);
      this.autoSaveHandler = this.autoSaveHandler.bind(this);
      this.saveAndContinueHandler = this.saveAndContinueHandler.bind(this);
      this.changeHandler = this.changeHandler.bind(this);
    },

    addEvents: function(){
      this.frm.getElements('.buttons a[rel="after-post"]').addEvent('click', this.redirectHandler);
      this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
      this.frm.getElements('.buttons a[rel="post"]').addEvent('click', this.postHandler);
      this.frm.getElements('.buttons a[rel="save"]').addEvent('click', this.saveHandler);
      this.frm.getElements('.buttons a[rel="save-and-continue"]').addEvent('click', this.saveAndContinueHandler);
      this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
      this.frm.addEvent('change', this.changeHandler);
      this.frm.addEvent('submit', function(e){ e.preventDefault(); });
      this.container.addEvent('domready', this.onContentReady.bind(this));
      //this.frm.addEvent('keydown', this.changeHandler);
    },

    submit: function(button, callback, url) {
      url = url || this.frm.getAttribute('action');

      this.doSubmit = function(){
        if (this.saveInProgress()){
            console.log('Race condition: save in progress. Re-run in 500ms');
            window.setTimeout(this.doSubmit, 500);
            return;
        }
        var valueToPost = {};
        if(button.dataset.itemForm){
            valueToPost = this.frm;
        } else if(this.frm.getElement('[name=edit_session]')){
            valueToPost = {'edit_session': this.frm.getElement('[name=edit_session]').value};
        }

        (this.frm.getParent('.popup') || document.body).addClass('loading');
        this.saveRequest = new Request({
          url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax' +(this.is_popup?'&__popup=':''),
          onSuccess: function(result){
            try {
              if (typeof result == 'string') {
                result = JSON.decode(result);
              }
            } catch (e){}

            if (result.lost_lock) {
              this.frm.getElement('.item-lock').retrieve('item-lock').updateLock();
            }

            if (result.success){
              if (this._callback_hook) {
                this._callback_hook(result, function(){
                  callback.call(this, result, button);
                });
              } else {
                callback.call(this, result, button);
              }
            } else {
              console.log('form load to', this.container)
              renderPage(result, this.container);
            }
          }.bind(this)
        }).post(valueToPost); // XXX Post to IFRAME!
      }.bind(this);

      var hooks = this.frm.retrieve('hooks');
      hooks.apply(button);
    },

    load: function(url){
      loadPage(url, true, this.container);
    },

    _getFirstError(element) {
      var errorSelector = '.error',
          errors = document.querySelectorAll(errorSelector);
      if (errors.length > 0) {
        return errors[0]
      }
    },

    onContentReady: function(e) {
      var firstError = this._getFirstError(this.container),
          form = this.container.querySelector('form');
          flashmessages = form.dataset.flashmessages || '',
          parsedFlashmessages = JSON.parse(flashmessages);
      
      if (firstError) {
        var scrollOptions = {block: 'center', behavior: 'smooth'};
        setTimeout(() => firstError.scrollIntoView(scrollOptions), 1000);
      }

      if (flashmessages) {
        flashAll(parsedFlashmessages);
      }
    },

    changeHandler: function(e){
      var newData = this.formHash(); // XXX works only on blur, have to check form hash each time
      if(this.frm.retrieve('savedData') != newData){
        this.statusElement.setAttribute('data-status', 'changed');
      }
    },

    redirectHandler: function(e){
      e.preventDefault(); e.stopPropagation();
      this.submit(e.target, function(result, button){
        //if (e.target.dataset.itemLock){
          // the action, we are redirecting to, needs a lock, do not release it
        //  this.holdLock();
        //}
        this.load(button.getProperty('href'));
      }.bind(this));
    },

    //holdLock: function(){
    //  /* 
    //   * Call before page re-rendering if you do not want to release a lock
    //   */
    //  // stop ItemLock,
    //  // otherwise the lock is released when form is dropped from the DOM
    //  this.frm.getElement('.item-lock').retrieve('item-lock').stop();
    //},

    postHandler: function(e){
      e.preventDefault(); e.stopPropagation();

      var button = e.target;
      var url = button.getAttribute('href');
      var _doSubmit = function(){
        this.submit(button, function(result){
          renderPage(result, this.container);
        }.bind(this), url);
      }.bind(this);

      if (!button.dataset.itemForm){
        this.autoSaveHandler(_doSubmit);
      } else {
        _doSubmit();
      }
    },

    saveHandler: function(e){
      e.preventDefault(); e.stopPropagation();
      this.submit(e.target, function(result, button){
        if(this.is_popup){
          this.popup.retrieve('popup').empty().hide();
        } else {
          this.load(button.getProperty('href'));
        }
      }.bind(this));
    },

    autoSaveHandler: function(callback){
      var url = this.frm.dataset.autosave;
      if (! url || this.saveInProgress()) {
        // `&& typeof(callback) == 'function'` 
        // is the HACK to make the code work in FF 8.0.1
        if (callback && typeof(callback) == 'function') { callback(); }
        return;
      }

      if (! this.frm.getParent('body') ) {
        console.log('AUTOSAVE stop')
        window.clearInterval(this.autoSaveInterval);
        return;
      }

      var newData = this.formHash();
      if(this.frm.retrieve('savedData') == newData){
        //console.log('AUTOSAVE no changes');
        if (this.statusElement.getAttribute('data-status') != 'draft') {
          this.statusElement.setAttribute('data-status', 'no-changes');
        }
        if (callback && typeof(callback) == 'function') { callback(); }
        return;
      }

      this.statusElement.setAttribute('data-status', 'saving');

      this.saveRequest = new Request.JSON({
        url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax',

        onSuccess: function(result){
          $$('.autosave-errors').removeClass('autosave-errors');
          if (result.success || result.error == 'draft'){
            this.frm.store('savedData', newData);
            if (callback && typeof(callback) == 'function') { callback(); }
          }
          if (result.success){
            this.statusElement.setAttribute('data-status', 'saved');
            this.frm.setAttribute('action', result.item_url);
            this.frm.dataset.autosave = result.autosave_url;
            this.frm.dataset.itemId = result.item_id;
            if(!this.is_popup){
              history.replaceState(null, null, result.item_url);
            }
            this.frm.getElements('.error').destroy();
            if (result.edit_session){
              // take a lock for new item saved first time (before save item
              // didn't have an id, and the lock couldn't be taken)
              this.frm.getElement('.item-lock').retrieve('item-lock').handleForceLock(result);
            }
          } else if (result.error == 'draft') {
            this.statusElement.setAttribute('data-status', 'draft');
            var errors = result.errors;

            for (var key in errors) if (errors.hasOwnProperty(key)){
              var field = $(this.frm.id + '-' + key);
              if (field){
                field.getParent('.form-row').addClass('autosave-errors');
              }
            }
            this.frm.getElements('.error').each(function(el){
              if (! el.getParent('.form-row').hasClass('autosave-errors')){
                el.destroy();
              }
            });
          }
        }.bind(this),
        onFailure: function(){
          this.statusElement.setAttribute('data-status', 'error');
        }.bind(this)
      }).post(this.frm); 
    },

    saveAndContinueHandler: function(e) {
      e.preventDefault(); e.stopPropagation();
      this.submit(e.target, function(result){
        // After save we render the same page, do not release the lock
        //this.holdLock();
        this.load(result.item_url, true, this.container);
      }.bind(this));
    },

    hasChanges: function(){
      var newData = this.formHash();
      return this.frm.retrieve('savedData') != newData;
    },

    stopAutosave: function(){
      console.log('AUTOSAVE off')
      window.clearInterval(this.autoSaveInterval);
      this.statusElement.dataset.autosaveOff = 'true';
    },

    formHash: function(){
      /*
       * pseudo-qs formatting for form content
       */
      // XXX hash?
      var queryString = [];
      this.frm.getElements('input, select, textarea').each(function(el){
        var type = el.type;
        if (!el.name || el.name.charAt('0') == '_' || el.name == 'edit_session' || el.disabled || 
            type == 'submit' || type == 'reset' || type == 'file' || type == 'image' 
            ) return;
            // XXX provide an interface for widgets that can track their changes
            // themselves

        if (el.dataset.blockName == 'wysihtml5'){
          var widget = el.retrieve('widget');
          if (widget) {
            widget.composer.undoManager.transact();
            var value = ''+widget.composer.undoManager.version;
          } else {
            var value = '1';
          }
        } else {
          var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
            // IE
            return document.id(opt).get('value');
          }) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');
        }

        Array.from(value).each(function(val){
          if (typeof val != 'undefined'){
            queryString.push([el.name, val.trim()]);
          };
        });
      });
      return queryString.sort(function(x){return x[0];})
                        .map(function(x){return x.join('=');})
                        .join('&');
    }
  };


  Blocks.register('item-form', function(el){
    new ItemForm(el);
  });

  Blocks.register('compact-buttons', function(el){
    var clsRe = /(?:^|\s)icon-([^\s]+)/;
    var buttons = el.getElements('.button').map(function(el){
      var match = el.className.match(clsRe);
      if (match && !el.get('title')){
        el.set('title', el.get('text').trim());
      }
      return match && match[1];
    }).filter(function(a){return a});

    if (el.dataset.compactName) {
      buttons.push(el.dataset.compactName);
    }

    var isCompact = !buttons.filter(function(cls){
      return !window.localStorage['compact:'+cls];
    }).length;

    if(isCompact){
      el.addClass('compact').addClass('no-animation');
      window.setTimeout(function(){ el.removeClass('no-animation') }, 100)
    }
    el.getElement('.compact-toggle').addEvent('click', function(){
      isCompact = !isCompact;
      if (isCompact){
        el.addClass('compact');
        buttons.each(function(cls){
          window.localStorage['compact:'+cls]="1";
        });
      } else {
        el.removeClass('compact');
        buttons.each(function(cls){
          delete window.localStorage['compact:'+cls];
        });
      }
    });
  });
})();
