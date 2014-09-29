/** @jsx React.DOM */

(function() {
    var HiddenInputProto = Object.merge({}, Widgets.WidgetProto, {
        render: function() {
            return <input type="hidden"
                          name={this.props.input_name}
                          value={this.state.value}/>;
        }
    });
    var TextInputProto = Object.merge({}, Widgets.WidgetProto, {
        componentDidMount: function(){
            var el = this.getDOMNode();
            if (window.LongPress){
                LongPress(el);
            }
        },

        onKeyDown: function(){
          var itemForm = this.getItemForm();
          if (itemForm) {
            itemForm.delayAutosave();
          }
        },
        render: function() {
            return <input type="text"
                          name={this.props.input_name}
                          value={this.state.value.text}
                          onKeyDown={this.onKeyDown}
                          onBlur={this.onBlur}
                          onChange={this.onChange}></input>;
        }
    });

    var TextareaProto = Object.merge({}, TextInputProto, {
        render: function() {
            return <textarea name={this.props.input_name}
                             onChange={this.onChange}
                             onKeyDown={this.onKeyDown}
                             onBlur={this.onBlur}
                             value={this.state.value.text}></textarea>;
        }
    });

    Widgets.HiddenInput = React.createClass(HiddenInputProto);
    Widgets.TextInput = React.createClass(TextInputProto);
    Widgets.Textarea = React.createClass(TextareaProto);

})();
