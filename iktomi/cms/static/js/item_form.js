function _clone(sourceProp){
    var prop = {};
    for (var k in sourceProp) if(sourceProp.hasOwnProperty(k)) {
        prop[k] = sourceProp[k];
    }
    return prop;
}
 
function _mergeObjects(value, newValue){
    if(value == newValue) { return value; }
 
    if (Array.isArray(value)){
        var byKey = {};
        for (var i=value.length; i--;){
            if(value[i]._key === undefined) {
                console.warn('_key attribute is required to merge arrays');
            }
            byKey[value[i]._key] = value[i];
        }
        value.length = 0;
        var newLength = newValue.length;
        for (var i=0; i<newLength; i++){
            var key = newValue[i]._key;
            if(key === undefined) {
                console.warn('_key attribute is required to merge arrays');
            }
            if (byKey.hasOwnProperty(key)) {
                var val = _mergeObjects(byKey[key], newValue[i]);
            } else {
                var val = newValue[i];
            }
            value.push(val);
        }
        return value;
    } else if (typeof value == 'object') {
        for (var key in newValue) if(newValue.hasOwnProperty(key)){
            value[key] = _mergeObjects(value[key], newValue[key]);
        }
        return value
    }
    return newValue;
}



(function(){
  function ItemForm(frm){

    this.frm = frm;
    this._callback_hook = undefined;
    frm.store('ItemForm', this);
    this.container = frm.getParent('.popup-body') || $('app-content');
    this.is_popup = !!frm.getParent('.popup-body');
    this.popup = frm.getParent('.popup');
    this.statusElement = this.frm.getElement('.autosave-status') || new Element('div');

    this.bindEventHandlers();
    this.addEvents();
    this.attachHooks();

    var form = FieldSet.fromJSON(frm.dataset.json);
    var buttons = ButtonPanel.fromJSON(this, frm.dataset.buttons, frm.dataset.state)

    window.props = form.props;
    window.dataCopy = _clone(form.props.data);
    window.form = this.reactForm = React.renderComponent(form, frm.getElement('.form'));
    window.buttons = this.buttons = React.renderComponent(buttons, frm.getElement('.buttons-place'));

    frm.store('savedData', this.formHash());
    window.scrollTo(window.scrollX, window.scrollY+1);
  }

  ItemForm.prototype = {

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
      //this.redirectHandler = this.redirectHandler.bind(this);
      //this.postHandler = this.postHandler.bind(this);
      //this.saveHandler = this.saveHandler.bind(this);
      this.autoSaveHandler = this.autoSaveHandler.bind(this);
      //this.saveAndContinueHandler = this.saveAndContinueHandler.bind(this);
      this.changeHandler = this.changeHandler.bind(this);
    },

    addEvents: function(){
      //this.frm.getElements('.buttons a[rel="after-post"]').addEvent('click', this.redirectHandler);
      //this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
      //this.frm.getElements('.buttons a[rel="post"]').addEvent('click', this.postHandler);
      //this.frm.getElements('.buttons a[rel="save"]').addEvent('click', this.saveHandler);
      //this.frm.getElements('.buttons a[rel="save-and-continue"]').addEvent('click', this.saveAndContinueHandler);
      //this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
      this.frm.addEvent('change', this.changeHandler);
      //this.frm.addEvent('keydown', this.changeHandler);
    },

    submit: function(options) {
      console.log(options);
      options = options || {};
      var callback = options.callback || function(){};
      var url = options.url || this.frm.getAttribute('action');

      this.doSubmit = function(){
        var valueToPost = {};
        if(options.itemForm){
            valueToPost.json = JSON.stringify(this.reactForm.getValue());
        }
        if(this.frm.getElement('[name=edit_session]')){
            valueToPost.edit_session = this.frm.getElement('[name=edit_session]').value;
        }
        if(options.autosave){
            valueToPost.autosave = true;
        }

        var applyResult = function (result){
          this.reactForm.setErrors(result.form.errors);

          var newValue = JSON.stringify(this.reactForm.getValue());

          // XXX is this ok?
          if (result.form.data && newValue == valueToPost.json) {
            // nothing changed on client side
            this.reactForm.setValue(result.form.data);
            this.frm.store('savedData', this.formHash());
          }
        }.bind(this);

        document.body.addClass('loading'); // XXX only for blocking requests
        this.statusElement.setAttribute('data-status', 'saving');

        new Request({
          url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax' +(this.is_popup?'&__popup=':''),
          onSuccess: function(result){
            try {
              if (typeof result == 'string') {
                result = JSON.decode(result);
              }
            } catch (e){}

            document.body.removeClass('loading');

            if (result.success){
              applyResult(result);

              this.statusElement.setAttribute('data-status', 'saved');

              if(!this.is_popup){
                history.replaceState(null, null, result.item_url);
              }

              if (result.edit_session){
                // take a lock for new item saved first time (before save item
                // didn't have an id, and the lock couldn't be taken)
                this.frm.getElement('.item-lock').retrieve('item-lock').handleForceLock(result);
              }

              if (this._callback_hook) {
                this._callback_hook(result, function(){
                  callback.call(this, result, options);
                });
              } else {
                callback.call(this, result, options);
              }
            } else if (result.error == 'draft') {
              this.statusElement.setAttribute('data-status', 'draft');
              applyResult(result);
            } else if (result.error == 'errors') {
              this.statusElement.setAttribute('data-status', 'error');
              applyResult(result);
            } else if (result.error == 'item_lock') {
              this.frm.getElement('.item-lock').retrieve('item-lock').updateLock();
            } else {
              console.log('form load to', this.container)
              renderPage(result, this.container);
            }
          }.bind(this),

          onFailure: function(){
            document.body.removeClass('loading');
            this.statusElement.setAttribute('data-status', 'error');
          }.bind(this)
        }).post(valueToPost) // XXX Post to IFRAME!
      }.bind(this);

      if (!options.autosave){
        var hooks = this.frm.retrieve('hooks');
        hooks.apply(options.title);
      } else {
        this.doSubmit()
      }
    },

    load: function(url){
      loadPage(url, true, this.container);
    },

    changeHandler: function(e){
      var newData = this.formHash(); // XXX works only on blur, have to check form hash each time
      if(this.frm.retrieve('savedData') != newData){
        this.statusElement.setAttribute('data-status', 'changed');
      }
    },

    redirectHandler: function(options){
      this.submit(Object.merge({}, options, {
        callback: function(result, options){
          //if (e.target.dataset.itemLock){
            // the action, we are redirecting to, needs a lock, do not release it
            //this.holdLock();
          //}
         this.load(options.redirect);
        }.bind(this)
      }));
    },

    //holdLock: function(){
    //  /* 
    //   * Call before page re-rendering if you do not want to release a lock
    //   */
    //  // stop ItemLock,
    //  // otherwise the lock is released when form is dropped from the DOM
    //  this.frm.getElement('.item-lock').retrieve('item-lock').stop();
    //},

    postHandler: function(options){
      var _doSubmit = function(){
        this.submit(Object.merge({}, options, {
          callback: function(result){
            renderPage(result, this.container);
          }.bind(this)
        }));
      };

      if (!options.itemForm){
        this.autoSaveHandler(_doSubmit);
      } else {
        _doSubmit();
      }
    },

    saveHandler: function(options){
      this.submit(Object.merge({}, options, {
        'callback': function(result, options){
          if(this.is_popup){
            this.popup.retrieve('popup').empty().hide();
          } else {
            this.load(options.redirect);
          }
        }.bind(this)
      }));
    },

    autoSaveHandler: function(callback){
      if (! this.frm.dataset.autosave) {
        if (callback) { callback(); }
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
        if (callback) { callback(); }
        return;
      }

      this.statusElement.setAttribute('data-status', 'saving');
      // XXX must be two types of autosave:
      // * BLOCKING. When data must be updated from server
      // * NON-BLOCKING. Just save a data and show errors, do not upgrade a form

      this.submit({autosave: true});
    },

    saveAndContinueHandler: function(options) {
      this.submit(options);
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
