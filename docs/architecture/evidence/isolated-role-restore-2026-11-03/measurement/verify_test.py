import unittest,os
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('role_restore',Path(__file__).with_name('verify.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Boundaries(unittest.TestCase):
 def target(self):
  return {'Id':'new','Name':'/knolstory-role-restore-'+'a'*32,'Image':'sha256:fixture','Config':{'Labels':{module.LABEL:'a'*32}},'HostConfig':{'NetworkMode':'none','ReadonlyRootfs':True,'PortBindings':{},'Tmpfs':{p:'rw'for p in ['/var/lib/postgresql/data','/var/run/postgresql','/tmp']}},'Mounts':[{'Type':'bind','Destination':'/run/knolstory-production-owner','Source':'/fixture/owner','RW':False}]}
 def test_target_requires_exact_owned_network_none_nonproduction_container(self):
  value=self.target();module.check_target(value,'a'*32,'sha256:fixture',{'original'},'/fixture/owner')
  for changed in [{**value,'Id':'original'},{**value,'Name':'/knolstory-next-production-db-1'},{**value,'HostConfig':{**value['HostConfig'],'NetworkMode':'bridge'}},{**value,'HostConfig':{**value['HostConfig'],'PortBindings':{'5432/tcp':[{'HostIp':'0.0.0.0'}]}}}]:
   with self.assertRaises(ValueError):module.check_target(changed,'a'*32,'sha256:fixture',{'original'},'/fixture/owner')
 def test_runner_cannot_join_source_or_mount_an_unrelated_secret(self):
  sources={p:'/fixture/'+str(i)for i,p in enumerate(module.RUNNER_MOUNTS)}
  value={'Image':'sha256:node','Config':{'Labels':{module.LABEL:'a'*32},'User':str(os.getuid())+':'+str(os.getgid())},'HostConfig':{'NetworkMode':'container:new','ReadonlyRootfs':True,'PortBindings':{},'CapDrop':['ALL'],'SecurityOpt':['no-new-privileges']},'Mounts':[{'Type':'bind','Source':sources[p],'Destination':p,'RW':False}for p in module.RUNNER_MOUNTS]}
  module.check_runner(value,'a'*32,'sha256:node','new',sources)
  for changed in [{**value,'HostConfig':{**value['HostConfig'],'NetworkMode':'container:original'}},{**value,'Mounts':[{**value['Mounts'][0],'Source':'/wrong/private'},*value['Mounts'][1:]]},{**value,'Mounts':value['Mounts']+[{'Type':'bind','Source':'/wrong','Destination':'/private','RW':True}]}]:
   with self.assertRaises(ValueError):module.check_runner(changed,'a'*32,'sha256:node','new',sources)
 def test_persistent_or_wrong_bind_mount_is_refused_before_target_start(self):
  value=self.target()
  for changed in [{**value,'Mounts':value['Mounts']+[{'Type':'volume','Destination':'/var/lib/postgresql/data','RW':True,'Source':'existing-data'}]},{**value,'HostConfig':{**value['HostConfig'],'Tmpfs':{}}},{**value,'Mounts':[{**value['Mounts'][0],'Source':'/wrong/owner'}]}]:
   with self.assertRaises(ValueError):module.check_target(changed,'a'*32,'sha256:fixture',{'original'},'/fixture/owner')
if __name__=='__main__':unittest.main()
