function ItemLock(el){
  this.initialize(el, el.dataset);

  el.store('item-lock', this);
}

ItemLock.prototype = {

  options: {
    'maxFailedAttempts': 3,
    'timeout': 60,
    'backTitle': 'Перейти к списку',
    'backHelp': 'Переход на страницу со списком объектов'
  },

  initialize: function(el, options){
      this.el = el;
      this.options = Object.merge({}, this.options, options)
      this.failedAttempts = 0;
      this.updateTimer = this.checkTimer = null;
      this.options.timeout = Math.round((this.options.timeout/3)*1000);
      this.popup = new Popup(_popup_id(), {'close_button_on':false, 'clickable_overlay':false});

      this.updateRequest = null;
      this.forceLockRequest = null;
      this.lockActions = this.getActions();
      this.editSessionField = this.el.getParent('form').getElement('[name="edit_session"]');
      this.editSession = sessionStorage[this.options.globalId];
      var activeSession = this.options.editSession;

      if(this.options.lockMessage != '' && (!this.editSession || this.editSession != activeSession)){
        this.showDialog(this.options.lockMessage, this.lockActions.slice(1), activeSession);
      } else {
        this.setEditSession(activeSession);
        if (!this.options.noStart){
          this.start();
        }
      }
  },

  setEditSession: function(editSession){
      sessionStorage[this.options.globalId] = 
          this.editSession = 
          this.editSessionField.value = editSession;
  },

  getActions: function(){
    return [
        ['Захватить блокировку', this.forceLock, 'Изменения, внесённые другим редактором, будут потеряны при сохранении'],
        ['Захватить блокировку с перезагрузкой', this.forceLockWithReload, 'Внесённые вами изменения будут потеряны'],
        [this.options.backTitle, this.goToList, this.options.backHelp]
    ];
  },


  start: function(){
    if(this.updateTimer == null) {
      this.updateTimer = setInterval(this.updateLock.bind(this), this.options.timeout);
    }
    if(this.checkTimer == null) {
      this.checkTimer = setInterval(this.checkReleaseLock.bind(this), 1000);
    }
  },

  stop: function(){
    console.log('LOCK stop')
    clearInterval(this.updateTimer);
    clearInterval(this.checkTimer);
    this.updateTimer = this.checkTimer = null;
  },

  goToList: function(){
      window.location.href = this.options.listUrl;
  },

  noJsonHandler: function(request){
    //there should auth handler
    //alert('Требуется авторизация');
  },

  checkLock: function(){
    // XXX Do not check while requests are in progress
    var locks = $$('.item-lock');
    for (var i=locks.length; i--;){
      var data = locks[i].dataset;
      if (data.globalId == this.options.globalId &&
          data.editSession == this.editSession){
        return true;
      }
    }
    return false;
  },
  checkReleaseLock: function(){
    if (!this.el || !this.el.getParent('body')){
      this.stop();
      if(!this.checkLock()){
        console.log('LOCK is detached')
        this.releaseLock();
      }
    }
  },

  getUrl: function(url){
    return url.replace('GLOBAL_ID', this.options.globalId).replace('EDIT_SESSION', this.editSession);
  },

  updateLock: function(){
    var url = this.getUrl(this.options.updateLockUrl);
    this.updateRequest = new Request.JSON({
      'url': url,
      'onSuccess': this.handleUpdate.bind(this),
      'onFailure': this.handleError.bind(this)
    }).send();
  },

  handleUpdate: function(response){
      if(response == null){
        this.noJsonHandler(this.updateRequest);
      } else if(response.status == 'fail'){
        this.stop();
        this.showDialog(response.message, this.lockActions, response.locked_session)
      } else {
        this.failedAttempts = 0;
        this.popup.hide();
      }
  },

  forceLock: function(e, success_handler){
    success_handler = success_handler|| this.handleForceLock.bind(this);

    var url = this.getUrl(this.options.forceLockUrl)
    this.forceLockRequest = new Request.JSON({
      'url': url,
      'onSuccess': success_handler,
      'onFailure': this.handleError.bind(this)
    }).send();
  },

  forceLockWithReload: function(e){
    this.forceLock(e, this.handleForceLockWithReload.bind(this));
  },

  handleForceLock: function(response){
    if(response == null){
      this.noJsonHandler(this.forceLockRequest);
    } else if(response.status == 'captured') {

      this.stop();
      this.start();
      if (response.global_id !== undefined){
        this.options.globalId = response.global_id;
      }
      sessionStorage[this.options.globalId] = 
          this.editSession =
          this.editSessionField.value = response.edit_session;
      this.popup.hide();
    } else if(response.status == 'fail'){
      this.stop();
      this.showDialog(response.message, this.lockActions, response.locked_session);
    }
  },

  handleForceLockWithReload: function(response){  
    if(response == null){
      this.noJsonHandler(this.forceLockRequest);
    } else if(response.status == 'captured') {
      sessionStorage[this.options.globalId] = response.edit_session;
      this.releaseLock = function(){}; // To not release the lock
      var parentPopup = this.el.getParent('.popup');
      parentPopup = parentPopup && parentPopup.retrieve('popup')
      popupUrl = parentPopup && parentPopup.contentEl.dataset.url;
      if (popupUrl) {
        loadPage(popupUrl, false, parentPopup.contentEl);
        parentPopup.contentEl.addEvent('load', function(){
          parentPopup.onWindowResize();
        });
        this.popup.hide();
      } else {
        window.location.reload(true); // XXX should work without reload
      }
    } else if(response.status == 'fail'){
      this.stop();
      this.showDialog(response.message, this.lockActions, response.locked_session)
    }
  },

  releaseLock: function(){
    var url = this.getUrl(this.options.releaseLockUrl);
    new Request({'url': url}).send()
  },

  handleError: function(response){
    this.failedAttempts++;
    if(this.failedAttempts >= this.options.maxFailedAttempts){
      this.stop();
    }
    this.popup.hide();
    this.popup.setTitle('Ошибка: ' + response.status);

    this.popup.setContent(response.responseText);
    this.popup.adopt(new Element('div', {'class':'buttons'}).adopt(
      new Element('a', {'class': 'button', 
                        'text':'закрыть и продолжить работу'
      }).addEvent('click', function(){
        this.popup.hide();
        this.start();
      }.bind(this))
    ));
    this.popup.show();

  },

  toggleExtraInfo: function(){
    this.popup.contentEl.toggleClass('item-lock-show-extra');
  },

  showDialog: function(text, buttons, locked_session){
    text = text.replace('__OBJ__', this.options.itemTitle);
    var buttons_pane = new Element('div', {'class':'buttons'});
    for (var i=0, l=buttons.length; i < l; i++){
      var label = buttons[i][0];
      var handler = buttons[i][1];
      var tooltip = buttons[i][2] || '';
      buttons_pane.adopt(
        new Element('a', {'class': 'button', 'title': tooltip, 'text':label}
        ).addEvent('click', handler.bind(this), false)
      )
    };

    this.popup.adopt(new Element('h3', {'text':text,
                                        'class': 'item-lock-toggle-extra'
                                       }).addEvent('click', this.toggleExtraInfo.bind(this)),
                     new Element('p', {'text': 'текущий ключ: '+ (this.editSession || '–'),
                                       'class': 'item-lock-extra'}));
    if (locked_session){
      this.popup.adopt(new Element('p', {'text': 'действительный ключ: '+ locked_session,
                                         'class': 'item-lock-extra'}));
    }
    this.popup.adopt(buttons_pane);
    this.popup.show();
  }//,
  //releasing_link: function(elem){
  //  elem = document.id(elem);
  //  var _t = this;
  //  elem.addEvent('click', function(e){
  //    if(!e.control && !e.shift && e.event.button == 0){
  //      _t.releaseLock();
  //      (function(){
  //        window.location = elem.get('href');
  //      }).delay(300);
  //      e.stop();
  //    }
  //  });
  //}
}

Blocks.register('item-lock', function(el){
  new ItemLock(el);
});

// XXX window refresh with this is annoying
//window.addEventListener('beforeunload', function(e){
//  var locks = $$('.item-lock').filter(function(frm){
//    var lock = frm.retrieve('item-lock');
//    if(lock) {
//        lock.releaseLock();
//    }
//    return !!lock;
//  });
//
//  if(locks.length){
//    // Hack preventing release request to be hadled after new page loaded
//    // I'm not shure if it works in FF
//    var iStart=new Date(); 
//    while(new Date()-iStart<400);
//  }
//}, false);
