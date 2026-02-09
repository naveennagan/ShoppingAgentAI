# Configuration Setup

## First Time Setup

Copy the example file and add your API key:

```bash
cp application.properties.example application.properties
```

Then edit `application.properties` and set your Gemini API key:

```properties
gemini.api.key=YOUR_ACTUAL_API_KEY_HERE
```

Or use environment variable:
```bash
export GEMINI_API_KEY=your_key_here
```

**Note:** `application.properties` is gitignored and will NOT be committed to the repository.
