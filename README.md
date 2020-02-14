# Celeste Run Verifier

It's pretty basic, but this script will pull all the data from speedrun.com apis for Celeste and process them. Outputting the results into a file `celeste.json`.

## Example File

[Generated 2020-02-14 - celeste.json - google drive](https://drive.google.com/file/d/1qC5upOOBYMMnYimiJ6v3_SApFqcrH-4J/view?usp=sharing).

## Setup

-   Make sure you have [node / npm](https://nodejs.org/en/) installed
-   In your console run `npm install`
-   Finally `npm run start`
-   ... Wait...
-   It should generate `celeste.json` in the same folder as this project
-   You can then open that document up and see any runs that are suspicious, etc. Make sure you've got a decent text editor with code folding to make this a lot easier.

## Caveats

-   Javascript is dumb with floats, so the maths to check if times are divisible by .017 is not super accurate all the time. So if you see something like this, chances are it's fine:

```json
{
    "(times.primary_t * 1000) / 17": 122478.00000000001,
    "(times.primary_t * 1000) % 17": 2.3283064365386963e-10
}
```

-   I've tried to account for this by multiplying everything by 1000 (e.g. seconds to milliseconds), but it's still not great.
