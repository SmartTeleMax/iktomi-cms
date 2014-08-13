/** @jsx React.DOM */

(function(){

    var FormRow = React.createClass({
        render: function() {
            var children = [];
            var widget = this.props.widget;
            var fieldset = this.props.fieldset;
            var label = (widget.props.label? 
                            <label for={widget.props.id}>{widget.props.label}</label> :
                            '');


            var widgetErrors = fieldset.state.errors[widget.props.key];
            var errorMsg = widgetErrors && widgetErrors['.']
            var error = (errorMsg? 
                            <div className="error">{errorMsg}</div> :
                            '');

            children = [error,
                        <div className="form-label">{label}</div>,
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
            var value = _mergeObjects(this.state.value, newValue);
            this.setState({'value': value});
        },
        getValue: function(){
            //for(var name in this.widgetsByName) if (this.widgetsByName.hasOwnProperty(name)){
            //    this.state.value[name] = this.widgetsByName[name].getValue();
            //}
            return this.state.value;
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
                ws.push(FormRow({fieldset: this, widget: el}));
            }

            return React.DOM.div({'className': 'fieldset',
                                  'onChange': this.onChange},
                                  ws);
        }
    });

})();
