/** @jsx React.DOM */

(function(){

    var FormRow = React.createClass({
        render: function() {
            var children = [];
            var widget = this.props.widget;
            var fieldset = this.props.fieldset;
            var label = (widget.props.label? 
                            <label htmlFor={widget.props.id}>{widget.props.label}</label> :
                            '');


            var widgetErrors = fieldset.state.errors[widget.props.key];
            var errorMsg = widgetErrors && widgetErrors['.']
            var error = (errorMsg? 
                            <div className="error">{errorMsg}</div> :
                            '');

            children = [error,
                        <div className="form-label" key={widget.props.key + '-label'}>{label}</div>,
                        widget];

            return React.DOM.div({'className': 'form-row'}, children);
        }
    });

    window.FieldSet = React.createClass({
        getInitialState: function() {
            var state = {'value': this.props.data,
                         'errors': this.props.errors};
            //delete this.props.data;
            return state;
        },

        getInputName: function(){
            var prefix = this.props.parent && this.props.parent.getInputName();
            if (prefix){
                return prefix + '.' + this.props.name;
            }
            return this.props.name;
        },

        setValue: function(newValue){
            newValue = makeMutable(newValue);
            var value = _mergeObjects(this.state.value, newValue);
            this.setState({'value': value});
        },
        getValue: function(){
            //for(var name in this.widgetsByName) if (this.widgetsByName.hasOwnProperty(name)){
            //    this.state.value[name] = this.widgetsByName[name].getValue();
            //}
            return this.state.value;
        },

        setErrors: function(newErrors){
            newErrors = makeMutable(newErrors);
            var errors = _mergeObjects(this.state.errors, newErrors);
            this.setState({'errors': errors});
        },

        onChange: function(){
            this.forceUpdate();
        },
        render: function() {
            //this.widgetsByName = {};
            var ws = [];
            for (var i=0; i<this.props.widgets.length; i++){
                var prop = _clone(this.props.widgets[i]);
                prop.data = this.props.data[prop.key];
                prop.errors = this.props.errors[prop.key] || {};
                prop.parent = this;

                var el = (React.DOM[prop.widget]||window[prop.widget])(prop);
                //this.widgetsByName[prop.key] = el;
                ws.push(FormRow({fieldset: this,
                                 widget: el,
                                 key: prop.key+"-row"}));
            }

            return React.DOM.div({'className': 'fieldset',
                                  'onChange': this.onChange},
                                  ws);
        }
    });

    window.FieldSet.fromJSON = function(json){
        var props = JSON.parse(json);
        props.data = makeMutable(props.data);
        props.errors = makeMutable(props.errors || {});
        return FieldSet(props)
    }

})();
