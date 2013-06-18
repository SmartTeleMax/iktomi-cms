from .base import metadata, AdminModel

# For internal use in admin interface
from internal import *

#from news import *
#from photos import *

__all__ = [name for name, value in globals().items()
           if isinstance(value, type) and issubclass(value, AdminModel)]
