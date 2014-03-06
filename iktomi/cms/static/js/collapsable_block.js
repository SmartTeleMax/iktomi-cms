var CollapsableForm = new Class({
  initialize: function(block){
    //var has_errors = block.getParent('form').getElement('.error');

    block.getElement('h2').addEvent('mousedown', function(e){
      e.stopPropagation(); e.preventDefault();
      block.toggleClass('closed');
    });

    if(block.getElements('.error').length > 0){
      block.removeClass('closed');
    }
    //if(!has_errors){
    //  container.getElements('.collapsable')[0].removeClass('closed');
    //}
  }
});

Blocks.register('collapsable-block', function(el){
    new CollapsableForm(el);
});
