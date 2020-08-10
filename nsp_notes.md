# The Norman Sicily Project

## Updating data

1. Get latest GEDCOM file
2. Convert line endings

    *Vim*

    1. Open the file with `:e ++ff=mac nsp.ged`
    2. convert the file format `:setlocal ff=unix`
    3. Write the changes `:w`

3. Optimize images

    *Gimp*

    * Scale images as necessary (72 px/in)
    * Export as PNG
        * uncheck ALL checkboxes
        * Set compression to the maximum value)

4. Copy files to genealogical-trees/data

5. Run `gedcom2csv/gedcom2csv.py`

    ```
    gedcom2csv.py ../genealogical-tree/data/nsp.ged
    ```

6. Update [Google Sheet](https://docs.google.com/spreadsheets/d/10-r4ISK1ooRoFNKK4TYhYVNv3gDmqSgOMqG37Guy8R8/edit?usp=sharing) with CSV data generated in previous step

      * Import as "People" sheet
      * Delete CSV file when done

7. Run `genealogical-trees/gedcom2json.sh`

    ```
    gedcom2json.sh ./data/nsp.ged ./data/nsp.json
    ```

    * When `gedcom2json.sh` completes, run the following commands

        ```
        cp ./data/nsp.ged.[run number]/nsp.ged.ttl ./data
        rm -rf ./data/nsp.ged.[run number]
        ```
8. Run `genealogical-trees/ttl2owl.py`

    ```
    ttl2owl.py ./data/nsp.ged.ttl 1500
    ```

9. Commit changes
