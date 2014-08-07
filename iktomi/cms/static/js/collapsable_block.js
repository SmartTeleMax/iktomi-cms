var CollapsableForm = new Class({
  initialize: function(block, options){
    this.block = block;
    this.setTitle = this.setTitle.bind(this);


    block.getElement('h2').addEvent('click', this.toggle.bind(this));

    this.titleSelectors = [];
    if (options.titleSelectors){
      this.titleSelectors = options.titleSelectors.split(',');
      block.addEvent('change', this.setTitle);
      this.setTitle.delay(10);
    }
    this.restoreState();
    // XXX hack to run after setTitle
    //     we run this immediatelly to avoid artefacts on page load
    //     and after setTitle to be always correct
    this.restoreState.bind(this).delay(20);
  },

  toggle: function(e){
    e.stopPropagation(); e.preventDefault();
    this.block.toggleClass('closed');
    this.setTitle();
    this.saveState();
  },

  getBlockKey: function (block) {
    var blockTitle = this.block.getElement('h2');
    if (blockTitle.getElement('.select_value')) {
        blockTitle = blockTitle.getElement('.select_value').get('text');
    } else {
        blockTitle = blockTitle.get('text');
    }

    var form = this.block.getParent('form');
    if (form) {
        var lock = form.getElement('.item-lock');
        if (lock) {
            var modelId = lock.get('data-global-id').split(':')[0];
            return modelId + '[' + blockTitle + ']';
        }
    }
    return null;
  },

  saveState: function (block) {
    var key = this.getBlockKey(block);
    if (key) {
      var value = this.block.hasClass('closed') ? 'closed': 'open';
      lscache.set(key, value, 7 * 24 * 60);
    }
  },

  restoreState: function (block) {
    var key = this.getBlockKey(block);
    if (key) {
      var value = lscache.get(key);
      if (value) {
        this.block.toggleClass('closed', value == 'closed');
      }
    }
    if (this.block.getElements('.error').length > 0){
      this.block.removeClass('closed');
    }
  },

  setTitle: function(){
    for (var i=0; i<this.titleSelectors.length; i++){
      var els = this.block.getElements(this.titleSelectors[i]);
      for (var j=0; j<els.length; j++){
        var el = els[j];
        var value = el?(el.get('value') || el.get('text')):null;
        if (el && el.tagName == 'TEXTAREA' && el.hasClass('wysihtml5')){
          value = value.replace(/<\/?[^>]+(>|$)/g, " ");
        }
        if (value){
          if (value.length > 90){
              value = value.substr(0, 90) + '…';
          }
          var title = this.block.getElement('h2');
          title = title.getElement('span') || title;
          title.set('text', value);
          return;
        }
      }
    }
  }
});

Blocks.register('collapsable-block', function(el){
    new CollapsableForm(el, el.dataset);
});
