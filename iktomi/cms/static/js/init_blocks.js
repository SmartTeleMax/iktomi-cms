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
        console.log('Init block: ' + key);
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
