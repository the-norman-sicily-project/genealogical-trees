# The Norman Sicily Project

## Updating data

1. Get latest GEDCOM file

2. Optimize images (optional)

    *Gimp*

    * Scale images as necessary (72 px/in)
    * Export as PNG
        * uncheck ALL checkboxes
        * Set compression to the maximum value)

3. Copy files to genealogical-trees/data

4. Run `genealogical-trees/gedcom2json.sh`

    ```
    gedcom2json.sh ./data/nsp.ged ./data/nsp.json
    ```

    * When `gedcom2json.sh` completes, run the following commands

        ```
        cp ./data/nsp.ged.[run number]/nsp.ged.ttl ./data
        rm -rf ./data/nsp.ged.[run number]
        ```
5. Run `genealogical-trees/ttl2owl.py`

    ```
    ttl2owl.py ./data/nsp.ged.ttl 1500
    ```

6. Commit changes
