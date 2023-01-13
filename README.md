# Gratify

Gratify is a full stack web framework.

Gratify uses twig, for documentation [look here](https://twig.symfony.com/doc/3.x/).

# Directories

- __/app/__ Backend application files exist here.
- __/plugins/__ All user created web component plugins exist here.
- __/public/__ Public files and assets, like images. Grunt will compile the gratify JS framework to this location.
- __/src/__ Source files for the gratify JS framework.
- __/templates/__ Backend, HTTP response templates.

# Routing

For all incoming requests, we will first check to see if the URL points to a valid file in /public/, and if it does then we will respond. When a file is not found -- in all other cases -- the request is routed to index.php. The index will process the request, and if valid, the request is passed to Site::route(). The router will execute a function in the API class. The function of choice is determined by the request URL. Routes _must also_ be defined in Site::$routes. So for example, the URL /api/my-function may route to Api::my_function(). The return value from this function will be the output of the response to the client. The response is pre-processed through one of the various /templates/ files. The most common template you will use is json.php, which is standard for performing AJAX requests or machine-to-machine calls.

# Special Routing

There exists a very special route -- __/api/plugin__. This route handles gratify's ability to process and deliver plugins to the frontend. This will be called for each plugin introduced to the client-side document.

# JSON Responses

When using the json template, all responses will have a standard format:

```
{
	errno: 0, // 0 means no error, positive values mean error
	error: '', // an error message if one exists
	payload: {"some": "data"} // returned by the api function
}
```

# Plugin Structure

Plugins are small, self contained web components. All plugins must reside within a namespace. Namespaces and plugin names should always be alphanumeric and contain only dashes or underscores otherwise. Each component must explicitly define 4 files:

1. __manifest.json__ Meta data about the plugin
2. __template.twig__ The plugin's HTML
3. __component.js__ The plugin's JS
4. __style.css__ The plugin's CSS

So for example, here's what a directory might look like for a plugin called "wagerpad" in namespace "xb-desktop":

```
/plugins
  /xb-desktop
    /wagerpad
      - manifest.json
      - component.js
      - style.css
      - template.twig
```

# Frontend Integration

To use gratify on your website, first include the framework:

```
<!-- gratify js -->
<script src="https://redist.nelroom.net/gratify/public/jquery-3.6.0.min.js"></script>
<script src="https://redist.nelroom.net/gratify/public/gratify-1.0.0.min.js"></script>
```

Now, you can start adding plugins to your site. This can be done in two ways:

```
// JS
gratify.plugin('.target #selector', 'my-namespace.my-plugin');

// HTML only
<div gfy-plugin="my-namespace.my-plugin"></div>
```

Gratify will automatically find elements with a gfy-plugin attribute and process them accordingly.

# Doc Reference

### Gratify Backend:

- __Site::get_session()__ Get the main site session handler
- __Site::enforce_auth()__ Throws an exception is user not logged in
- __Site::route($path, $strict = false)__ Routes the provided path to a local function
- __Site::set_template($template)__ Set the response template
- __Site::set_title($title)__ Set the page title * non-json templates only
- __Site::set_jsvar($name, $value)__ Set a JS variable * non-json templates only
- __Site::set_content($content)__ Set the response content
- __Site::get_template()__ Get the current template name
- __Site::get_template_path()__ Get the full template path
- __Site::get_title()__ Get the current page title
- __Site::get_content()__ Get the current page content

### Plugin Components

Plugin components are defined in the _component.js_ file of your plugin. Here's en example for a plugin called "test" in namespace "bakery":

```
gratify.components.bakery.test = {
	$create: function() {
		// this will run when the plugin loads
	},

	myCustomFunction: function() {
		// do something
	}
};
```

#### Special Functions:

You can define these functions in your plugin component. They will automatically execute under certain conditions.

- __$create()__ Executed when the plugin is created. This is basically a constructor.
- __$destroy()__ Executed when the plugin is dropped/deleted.
- __$update()__ Executed if the component defines $udefs and any of those definitions is updated during runtime.

#### Special Properties:

- __$id__ The component's ID (not an HTML ID). Immutable.
- __$container__ The master element containing the component HTML (this is a jQuery object). Immutable.
- __$udefs__ An array of dictionary definition names that will be tracked during runtime. When these definitions change (using request.def()) an event will be triggered and the component's $update function will be executed.

### JS Framework Reference

The gratify framework handle is referenced using _gratify_.

Properties:

- __gratify.endpoint__ A fully qualified URL to the gratify backend. This will always be "https://{ xb-online domain }/gratify/api".

Functions:

- __gratify.info()__ Print info about gratify.
- __gratify.error(message, tag)__ Trigger an error. It will be printed to the screen and the custom error callback will be executed if one exists.
- __gratify.say(message)__ Print some debug to the console in the form of 'Gratify says, "my message"'.
- __gratify.request(rqstring, params, callback, lastly)__ Perform an AJAX request. See the "Request Strings & AJAX" section for further detail.
- __gratify.def(name, value)__ Shorthand for defining and looking up dictionary definitions. See the "Dictionary" section for further detail.
- __gratify.bindauth(sid, after)__ Bind existing xb session to gratify backend (required for some plugins and requests).
- __gratify.plugin(target, plugin, params, orientation)__ Inject a plugin component into the page. See the "Plugin Structure" section for further detail. 
- __gratify.get(id)__ Get a reference to a spawned component.
- __gratify.find(selector)__ Find an element within the global doc. This is an alias for jQuery().
- __gratify.waitFor(selector, callback)__ Execute a callback as soon as gratify detects that the selector element exists within the doc.

### Examples

```
// JavaScript
// AJAX request to the gratify backend.
gratify.request('post ' + gratify.endpoint + '/my-api-function', {}, function(response) {
	if (response.errno) {
		// Do something
	}

	// Now we can do stuff with the payload
	console.log(response.payload);
});
```
