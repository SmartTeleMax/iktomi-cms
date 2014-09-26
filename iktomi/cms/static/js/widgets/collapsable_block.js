/** @jsx React.DOM */

(function(){
  CollapsableProto = {
    getInitialState: function() {
        var state = FieldSetProto.getInitialState.call(this);
        state = Object.merge(state, {'closed': this.props.closed,
                                     'title': this.props.title});
        //delete this.props.data;
        return state;
    },

    componentDidMount: function(){
      this.block = block;
      this.setTitle = this.setTitle.bind(this);


      block.getElement('h2').addEvent('click', this.toggle.bind(this));

      this.titleSelectors = [];
      if (this.props.title_selectors){
        this.titleSelectors = this.props.title_selectors.split(',');
        this.setTitle.delay(10);
      }
      this.restoreState();
      // XXX hack to run after setTitle
      //     we run this immediatelly to avoid artefacts on page load
      //     and after setTitle to be always correct
      this.restoreState.bind(this).delay(20);
    },

    toggle: function(e){
      this.state.closed = !this.state.closed;
      this.setState(this.state);
      this.setTitle();
      this.saveState();
    },

    getBlockKey: function (block) {
      var blockTitle = this.state.title;

      var form = this.getDOMNode().getParent('form');
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
        var value = this.state.closed ? 'closed': 'open';
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
    },

    render: function(){
      var widget = this.props;
      var hint = '';
      if (widget.hint){
          hint = <div className="hint hint-right">{widget.hint}</div>
      }
      var fieldset = FieldSetProto.render.call(this);
      return <div className={"form text init-block collapsable " + (widget.classname ||'')}
                  data-closed={this.state.closed || null}
                  onChange={this.setTitle}>
                {hint}
                <h2 className="block_title"
                    onClick={this.toggle}>{this.state.title}</h2>
                <div class="collapsable-content">
                  {fieldset}
                </div>
             </div>;
    }
  }
})();


