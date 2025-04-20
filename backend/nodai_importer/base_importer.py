class BaseImporter:
   def load(self, filepath_or_json):
        raise NotImplementedError("Subclasses should implement this!")

   def convert(self):
        raise NotImplementedError("Subclasses should implement this!")

   def export_to_nodai(self):
        raise NotImplementedError("Subclasses should implement this!")