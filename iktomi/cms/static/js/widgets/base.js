/** @jsx React.DOM */

function MutableString(text){
    this.text = text;
    this._key = text; // XXX is this ok?
}

MutableString.prototype = {
    toString: function(){
        return this.text.toString();    
    },
    toJSON: function(){
        return this.text;
    },
    set: function(value){
        this.text = value;    
    },
    copy: function(){
        return new MutableString(this.text);
    },
    indexOf: function(i){
      return this.text.indexOf(i);
    }
};


function makeMutable(obj){
    if (obj instanceof MutableString){
        return obj;
    }
    if (['string', 'number', 'boolean'].indexOf(typeof obj) != -1 || obj == null){
        return new MutableString(obj);
    }
    if (typeof obj == "object"){
        for(var name in obj) if (obj.hasOwnProperty(name)){
            obj[name] = makeMutable(obj[name]);
        }
        return obj
    }
    throw "Can not convert to mutable JS object";
}

(function() {

    // XXX how to do component inheritance in right way?
    var WidgetProto = {
        getInitialState: function() {
            if (this.props.data){
                var value = this.props.data;
                delete this.props.data;
            } else {
                var value = this.props.multiple? [] : {};
            }

            if (this.props.initial) {
                // Value object must be mutable.
                // As I understand, this is react's method to collect
                // changes from children.
                var initial = this.props.multiple? this.props.initial: {'text': this.props.initial};
            } else {
                var initial = this.props.multiple? []: {'text': ''};
            }
            var init = JSON.stringify(initial);
            initial = _mergeObjects(initial, value);
            return {'value': _mergeObjects(value, initial),
                    'errors': this.props.errors}
        },

        getItemForm: function(){
            var itemForm = this.getDOMNode().getParent('form');
            return itemForm && itemForm.retrieve('ItemForm');
        },

        getError: function(){
            return this.state.errors['.'] || '';
        },

        setValue: function(newValue){
            var value = _mergeObjects(this.state.value, makeMutable(newValue));
            this.setState({'value': value});

            var itemForm = this.getItemForm();
            if (itemForm) {
              itemForm.setChanged();
            }
        },
        getValue: function(){
            return this.state.value.text;
        },
        hasValue: function(val){
            val += '';
            if (this.props.multiple){
                for (var i=this.state.value.length; i--;){
                    if (val == this.state.value[i].text) { return true; }
                }
                return false
            } else {
                return val == this.getValue();
            }
        },

        reset: function(){
            this.setValue(this.props.multiple? []: '');
        },

        onBlur: function(e){
            var itemForm = this.getItemForm();
            if (itemForm) {
                itemForm.autoSaveHandler();
            }
        },

        onChange: function(e){
            this.setValue(e.target.value);
        }
    }


    window.Widgets = {};
    Widgets.WidgetProto = WidgetProto;

})();
