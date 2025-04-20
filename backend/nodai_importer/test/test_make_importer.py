import unittest
from nodai_importer.make_importer import MakeImporter

class TestMakeImporter(unittest.TestCase):
    def test_export_structure(self):
        sample_json = { "modules": [], "connections": [] }
        importer = MakeImporter(sample_json)
        importer.convert()
        nodai_format = importer.export_to_nodai()
        self.assertIn("nodes", nodai_format)
        self.assertIn("edges", nodai_format)



#  Create directory and files
for subdir in subdirs:
    dir_path = os.path.join(base_dir, subdir)
    os.makedirs(dir_path, exist_ok=True)

# Write the files
for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    with open(full_path, "w") as f:
        f.write(content)

base_dir