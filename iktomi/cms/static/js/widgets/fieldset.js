/** @jsx React.DOM */

(function(){

    var Hint = React.createClass({
        render: function() {
            var className = this.props.className || "hint";
            if (this.props.safe_hint){
                return <p className={className} dangerouslySetInnerHTML={{__html: this.props.hint}}/>;
            } else {
                return <p className={className}>{this.props.hint}</p>;
            }
        }
    })

    window.Hint = Hint;

    var FormRow = React.createClass({
        render: function() {
            var children = [];
            var widget = this.props.widget;
            var fieldset = this.props.fieldset;
            var label = (widget.props.label? 
                            <label htmlFor={widget.props.id} key="label">{widget.props.label}</label> :
                            '');
            var hint = '';
            if (widget.props.hint && !widget.props.renders_hint){
                hint = <Hint safe_hint={widget.props.safe_hint}
                             hint={widget.props.hint}
                             key="hint"/>
            }

            var widgetErrors = widget.props.readonly ? '' : fieldset.state.errors[widget.key];

            var errorMsg = widgetErrors && widgetErrors['.'] && widgetErrors['.'].text
            var error = (errorMsg? 
                            <div className="error" key="error">{errorMsg}</div> :
                            '');

            var widgetChangedFields = fieldset.state.changedFields?fieldset.state.changedFields[widget.key] : false;
var isFieldChanged = widgetChangedFields && widgetChangedFields ['.'] && widgetChangedFields['.'].text;
            if (widget.props.render_type == 'checkbox') {
              children = [error,
                          widget,
                          label,
                          hint];

            } else if (widget.props.render_type == 'hidden'){
              children = [error, widget];
            } else if (widget.props.render_type == 'full-width'){
              children = [error,
                          label,
                          widget,
                          hint];
            } else {
              children = [error,
                          <div className="form-label" key='label'>{label}</div>,
                          widget,
                          hint];
            }
            var className = 'form-row';
            if(isFieldChanged){
                className += ' changed-after-publication'
            }
            var styles = null;
            if (widget.props.render_type=="full-width") { className += ' full-width';}
            if (widget.props.render_type=="hidden") { styles = {'display': 'none'};}

            return <div className={className} style={styles}>
                      {children}
                   </div>;
        }
    });

    var FieldSetProto = {
        getDefault: function(){
            // called with no context (no `this`) before object creation
            return {};
        },
        getInitialState: function() {
            var state = {'value': this.props.data,
                         'changedFields':this.props.changedFields,
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

        onChange: function(){
            this.forceUpdate();
        },

        getPropsData: function(){
            return this.props.data;
        },

        getPropsErrors: function(){
            return this.props.errors;
        },
        
        getPropsChangedFields: function(){
            return this.props.changedFields;
        },

        render: function() {
            //this.widgetsByName = {};
            var ws = [];
            var data = this.getPropsData();
            var errors = this.getPropsErrors();
            var changedFields = this.getPropsChangedFields();
            for (var i=0; i<this.props.widgets.length; i++){
                var prop = _clone(this.props.widgets[i]);
                var originalKey = prop.key;
                if(!prop.key){
                    // Auto key property setting     
                    prop.key = "auto-key-" + i;
                }
                if (data[prop.key] == undefined){
                    var default_ = Widgets.getDefaultValue(prop);
                    if (default_ !== null){
                        data[prop.key] = default_;
                    }
                }
                prop.data = data[prop.key];
                if (originalKey && !this.props.readonly){
                    prop.errors = errors[prop.key] = errors[prop.key] || {'.': new MutableString('')};
                    prop.changedFields = changedFields[prop.key] = changedFields[prop.key] || {'.': new MutableString('')};
                } else {
                    prop.errors = errors;
                    prop.changedFields = changedFields;
                }
                prop.parent = this;
                prop.id = this.props.id + '.' + prop.key;
                prop.input_name = this.props.input_name ? 
                                  this.props.input_name + '.' + prop.key :
                                  prop.key;

                if(!(React.DOM[prop.widget]||Widgets[prop.widget])){
                    throw "Component does not exist: " + prop.widget;
                }
                var el = React.createElement(React.DOM[prop.widget]||Widgets[prop.widget], prop);
                //this.widgetsByName[prop.key] = el;
                ws.push(<FormRow fieldset={this}
                                 widget={el}
                                 key={prop.key+'-row'}></FormRow>);
            }

            return React.DOM.div({'className': 'fieldset',
                                  'onChange': this.onChange},
                                  ws);
        },

        toQueryString: function(){

            function toQueryString(object, base){
                var queryString = [];

                Object.each(object, function(value, key){
                    if (base) key = base + '.' + key;
                    var result;
                    if (value instanceof MutableString){
                      value = value.toString();
                    }
                    switch (typeOf(value)){
                        case 'object': result = toQueryString(value, key); break;
                        case 'array':
                            var qs = {};
                            value.each(function(val, i){
                                qs[i] = val;
                            });
                            result = toQueryString(qs, key);
                        break;
                        default: result = key + '=' + encodeURIComponent(value);
                    }
                    if (value) { queryString.push(result); }
                });

                return queryString.join('&');
            }

            return toQueryString(this.state.value);
        }
    }

    var ReactFormProto = Object.merge({}, FieldSetProto, {
        setErrors: function(newErrors){
            newErrors = makeMutable(newErrors);
            _clearErrors(this.state.errors);
            var errors = _mergeObjects(this.state.errors, newErrors);
            this.setState({'errors': errors});
        },

        setChangedFields: function(newChangedFields){
            newChangedFields = makeMutable(newChangedFields);
            _clearErrors(this.state.changedFields);
            var changedFields = _mergeObjects(this.state.changedFields, 
                                              newChangedFields);
            this.setState({'changedFields': changedFields});
        },

        flush: function(){
          function map(element){
            if (!element._renderedComponent) { return; }
            var chs = element._renderedComponent._renderedChildren;
            for (var key in chs) if (chs.hasOwnProperty(key)){
              var el = chs[key];
              if (el.flush != undefined){
                el.flush();
              }
              map(el);
            }
          }
          map(this);
        }

    });

    Widgets.FieldSetWidget = Widgets.FieldSet = Widgets.create(FieldSetProto);
    Widgets.FieldBlockWidget = Widgets.FieldBlock = Widgets.create(Widgets.FieldSet, {
        getDefault: function(){
            return null;
        },
        getPropsData: function(){
            return this.props.parent.props.data;
        },
        getPropsErrors: function(){
            return this.props.parent.props.errors;
        },
        getPropsChangedFields: function(){
            return this.props.parent.props.changedFields;
        }
    });

    window.ReactForm = React.createClass(ReactFormProto);
    window.ReactForm.fromJSON = function(json){
        var props = JSON.parse(json);
        props.data = makeMutable(props.data);
        props.errors = makeMutable(props.errors || {});
        props.changedFields = makeMutable(props.changedFields || {});
        return React.createElement(ReactForm, props);
    }

})();
