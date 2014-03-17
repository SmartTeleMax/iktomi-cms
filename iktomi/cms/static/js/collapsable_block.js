var CollapsableForm = new Class({
  initialize: function(block){

    block.getElement('h2').addEvent('click', function(e){
      e.stopPropagation(); e.preventDefault();
      block.toggleClass('closed');
    });

    if(block.getElements('.error').length > 0){
      block.removeClass('closed');
    }
  }
});

Blocks.register('collapsable-block', function(el){
    new CollapsableForm(el);
});
