function ItemLock(el){
  this.initialize(el, el.dataset);

  el.store('item-lock', this);
}

ItemLock.prototype = {

  options: {
    'max_failed_attempts': 3,
    'timeout': 60
  },

  initialize: function(el, options){
      this.el = el;
      this.options = Object.merge({}, this.options, options)
      console.log(this, this.options)
      this.failed_attempts = 0;
      this.update_timer = this.check_timer = null;
      this.options.timeout = Math.round((this.options.timeout/3)*1000);
      this.popup = new Popup(_popup_id(), {'close_button_on':false, 'clickable_overlay':false});
      this.update_request = null;
      this.force_lock_request = null;
      this.lock_actions = this.get_actions();
      this.edit_session_field = this.el.getParent('form').getElement('[name="edit_session"]');

      var lock_id = sessionStorage[this.options.global_id];
      console.log('LOCK', this.options.global_id, lock_id, this.options.edit_session);
      if(this.options.lock_message != '' && (!lock_id || lock_id != this.options.edit_session)){
        this.show_dialog(this.options.lock_message, this.lock_actions.slice(1));
      } else {
        sessionStorage[this.options.global_id] = this.options.edit_session;
        this.edit_session_field.value = this.options.edit_session;
        this.start();
      }
  },

  get_actions: function(){
    return [
        ['Захватить блокировку', this.force_lock, 'Изменения, внесённые другим редактором, будут потеряны при сохранении'],
        ['Захватить блокировку с перезагрузкой', this.force_lock_with_reload, 'Внесённые вами изменения будут потеряны'],
        ['Перейти к списку', this.go_to_list, 'Переход на страницу со списком объектов']
    ];
  },

  start: function(){
    if(this.update_timer == null) {
      this.update_timer = setInterval(this.update_lock.bind(this), this.options.timeout);
    }
    if(this.check_timer == null) {
      this.check_timer = setInterval(this.check_release_lock.bind(this), 1000);
    }
  },

  stop: function(){
    console.log('LOCK stop')
    clearInterval(this.update_timer);
    clearInterval(this.check_timer);
    this.update_timer = this.check_timer = null;
  },
  
  go_to_list: function(){
      window.location.href = this.options.list_url;
  },

  no_json_handler: function(request){
    //there should auth handler
    //alert('Требуется авторизация');
  },

  check_lock: function(){
    // XXX Do not check while requests are in progress
    var locks = $$('.item-lock');
    for (var i=locks.length; i--;){
      var data = locks[i].dataset;
      if (data.global_id == this.options.global_id &&
          data.edit_session == this.options.edit_session){
        return true;
      }
    }
    return false;
  },
  check_release_lock: function(){
    if (!this.el || !this.el.getParent('body')){
      this.stop();
      if(!this.check_lock()){
        console.log('LOCK is detached')
        this.release_lock();
      }
    }
  },

  update_lock: function(){
    this.update_request = new Request.JSON({
      'url':this.options.update_lock_url,
      'onSuccess': this.handle_update.bind(this),
      'onFailure': this.handle_error.bind(this)
    }).send();
  },

  handle_update: function(response){
      if(response == null){
        this.no_json_handler(this.update_request);
      } else if(response.status == 'fail'){
        this.stop();
        this.show_dialog(response.message, this.lock_actions)
      } else {
        this.failed_attempts = 0;
        this.popup.hide();
      }
  },

  force_lock: function(e, success_handler){
    success_handler = success_handler|| this.handle_force_lock.bind(this);
    this.force_lock_request = new Request.JSON({
      'url':this.options.force_lock_url,
      'onSuccess': success_handler,
      'onFailure': this.handle_error.bind(this)
    }).send();
  },

  force_lock_with_reload: function(e){
    this.force_lock(e, this.handle_force_lock_with_reload.bind(this));
  },

  handle_force_lock: function(response){
    if(response == null){
      this.no_json_handler(this.force_lock_request);
    } else if(response.status == 'captured') {

      this.stop();
      this.options.update_lock_url = response.update_lock_url;
      this.options.release_lock_url = response.release_lock_url;
      this.start();
      sessionStorage[this.options.global_id] = response.edit_session;
      this.edit_session_field.value = response.edit_session;
      this.popup.hide();
    } else if(response.status == 'fail'){
      this.stop();
      this.show_dialog(response.message, this.lock_actions)
    }
  },

  handle_force_lock_with_reload: function(response){  
    if(response == null){
      this.no_json_handler(this.force_lock_request);
    } else if(response.status == 'captured') {
      sessionStorage[this.options.global_id] = response.edit_session;
      this.release_lock = function(){}; // To not release the lock
      window.location.reload(); // XXX should work without reload
    } else if(response.status == 'fail'){
      this.stop();
      this.show_dialog(response.message, this.lock_actions)
    }
  },
  

  release_lock: function(){
      new Request({'url':this.options.release_lock_url}).send()
  },

  handle_error: function(response){
    this.failed_attempts++;
    if(this.failed_attempts >= this.options.max_failed_attempts){
      this.stop();
    }
    this.popup.hide();
    this.popup.setTitle('Ошибка: ' + response.status);

    this.popup.setContent(response.responseText);
    this.popup.adopt(new Element('div', {'class':'buttons'}).adopt(
      new Element('a', {'class': 'button'}).adopt(
        new Element('span', {'text':'закрыть и продолжить работу'})
      ).addEventListener('click', function(){
        this.popup.hide();
        this.start();
      }.bind(this), false)
    ));
    this.popup.show();

  },

  show_dialog: function(text, buttons){
    text = text.replace('__OBJ__', this.options.item_title);
    var buttons_pane = new Element('div', {'class':'buttons'});
    for (var i=0, l=buttons.length; i < l; i++){
      var label = buttons[i][0];
      var handler = buttons[i][1];
      var tooltip = buttons[i][2] || '';
      buttons_pane.adopt(
        new Element('a', {'class': 'button', 'title': tooltip}).adopt(
          new Element('span', {'text':label})
        ).addEvent('click', handler.bind(this), false)
      )
    };
    this.popup.adopt(
      new Element('h3', {'text':text}),
      buttons_pane
    );
    this.popup.show();
  }//,
  
  //releasing_link: function(elem){
  //  elem = document.id(elem);
  //  var _t = this;
  //  elem.addEvent('click', function(e){
  //    if(!e.control && !e.shift && e.event.button == 0){
  //      _t.release_lock();
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
//        lock.release_lock();
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
