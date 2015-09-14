# -*- coding: utf-8 -*-

from iktomi.forms import shortcuts, Field
from iktomi.cms.forms import ModelForm, convs, widgets
from iktomi.cms.stream import ListFields


list_fields = ListFields(('login', u'Логин'),
                         ('name', u'Имя'),
                         ('email', u'email'))
DEFAULT_ROLES = [
    ('wheel',   u'Полный доступ'),
    ('admin',   u'Администратор'),
    ('editor',  u'Редактор'),
]

def clean_password(conv, value):
    form = conv.field.form
    if not value and (not form.item or form.item.id is None):
        raise convs.ValidationError(u'Обязательное поле')
    return value


class RoleConv(convs.EnumChoice):

    @property
    def choices(self):
        return self.field.form.ROLES


class ItemForm(ModelForm):

    ROLES = DEFAULT_ROLES

    fields = [
        Field('name',
              conv=convs.Char(convs.length(3, 250), required=False),
              label=u"Имя"),
        Field('email',
              conv=convs.Email(convs.length(0, 200), required=False),
              label=u"E-mail"),
        Field('login',
              conv=convs.Char(
                    convs.DBUnique(
                        message=u'Объект с таким значением уже существует'),
                    convs.length(3, 250),
                    required=True,
              ),
              label=u"Логин"),
        shortcuts.PasswordSet('password', 
                              filters=(clean_password,),
                              widget=widgets.FieldSetWidget(
                                  template='widgets/fieldset-line'),
                              label=u'пароль',
                              confirm_label=u'подтверждение'),
        Field('active',
              conv=convs.Bool(),
              widget=widgets.CheckBox(),
              initial=True,
              label=u'Активен',
              hint=u'Пользователи с этим флагом могут входить в '
                   u'административный интерфейс'),
        Field('roles', label=u'Роли',
              conv=convs.ListOf(
                  RoleConv()),
              widget=widgets.CheckBoxSelect())
    ]

    def update__password(self, obj, name, value):
        if value is not None:
            obj.set_password(value)

    def update__roles(self, obj, name, value):
        if obj.roles is not None and 'wheel' in obj.roles and \
                'wheel' not in value:
            value.append('wheel')
        if (not obj.roles or 'wheel' not in obj.roles) and 'wheel' in value:
            value.remove('wheel')
        obj.roles = value



