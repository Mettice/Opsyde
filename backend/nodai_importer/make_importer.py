from base_importer import BaseImporter

class MakeImporter(BaseImporter):
    def __init__(self, make_json):
        self.raw = make_json
        self.nodes = []
        self.edges = []

    def load(self):
        # Load Make.com scenario JSON
        pass

    def convert(self):
        # Convert to Nodai nodes & edges
        pass

    def export_to_nodai(self):
        return {
            "nodes": self.nodes,
            "edges": self.edges
        }
