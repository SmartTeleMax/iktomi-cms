var CollapsableForm = new Class({
  initialize: function(block, options){
    this.block = block;
    this.setTitle = this.setTitle.bind(this);

    block.getElement('h2').addEvent('click', function(e){
      e.stopPropagation(); e.preventDefault();
      block.toggleClass('closed');
      this.setTitle();
    }.bind(this));

    if(block.getElements('.error').length > 0){
      block.removeClass('closed');
    }

    this.titleSelectors = [];
    if (options.titleSelectors){
      this.titleSelectors = options.titleSelectors.split(',');
      block.addEvent('change', this.setTitle);
      this.setTitle.delay(10);
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
