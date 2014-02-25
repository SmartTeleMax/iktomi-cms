(function(){

  function BlocksCls(){
    this.blocks = {};
  }

  BlocksCls.prototype = {
    init: function(container){
      var elems = container.getElements('.init-block');
      for (var i=0; i<elems.length; i++){
        var elem = elems[i];
        var key = elem.dataset.blockName;
        var block = this.blocks[key];
        if (! block) { throw "Block is not registered: "+ key; }
        //console.log('Init block: ' + key);
        block(elem);
        elem.removeClass('init-block');
      }
    },
    register: function(key, block){
      this.blocks[key] = block;
    }
  }



  window.Blocks = new BlocksCls;
})();

// XXX move from here?
Blocks.register('textarea', function(el){
  // XXX change events?
  if (window.LongPress){
    LongPress(el);
  }
  if (el.scrollHeight > el.getHeight()){
    el.setStyle('height', Math.min(el.scrollHeight+2,
                                   el.dataset.maxHeight || 400));
  }
});

Blocks.register('textinput', function(el){
  // XXX change events?
  if (window.LongPress){
    LongPress(el);
  }
});
